import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Heart, Syringe, Calendar, AlertCircle, Plus, Menu, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertHealthRecordSchema } from "@shared/schema";
import { z } from "zod";
import { Textarea } from "@/components/ui/textarea";

// Health record form schema - use the actual database schema for consistency
const healthFormSchema = insertHealthRecordSchema.pick({
  recordDate: true,
  flockId: true, 
  recordType: true,
  title: true,
  description: true,
  medicationUsed: true,
  dosage: true,
  administeredBy: true,
  nextDueDate: true,
  cost: true,
  notes: true,
}).extend({
  // Override date fields to handle string inputs from HTML date inputs
  recordDate: z.string().min(1, "Record date is required"),
  nextDueDate: z.string().optional(),
  // Override cost to handle string input like egg sale pattern
  cost: z.string().optional().refine(
    (val) => !val || val === "" || !isNaN(parseFloat(val)),
    "Invalid cost amount"
  ),
});

type HealthFormData = z.infer<typeof healthFormSchema>;

export default function HealthRecords() {
  const { toast } = useToast();
  const { isLoading, isAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [healthDialogOpen, setHealthDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: healthRecords = [], error: recordsError } = useQuery<any[]>({
    queryKey: ["/api/health-records"],
    enabled: isAuthenticated,
  });

  const { data: flocks = [], error: flocksError } = useQuery<any[]>({
    queryKey: ["/api/flocks"],
    enabled: isAuthenticated,
  });

  // Handle unauthorized errors
  useEffect(() => {
    if ((recordsError && isUnauthorizedError(recordsError)) || (flocksError && isUnauthorizedError(flocksError))) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [recordsError, flocksError, toast]);

  const healthForm = useForm<HealthFormData>({
    resolver: zodResolver(healthFormSchema),
    defaultValues: {
      recordDate: new Date().toISOString().split('T')[0],
      recordType: "vaccination",
      title: "",
      description: "",
      medicationUsed: "",
      dosage: "",
      administeredBy: "",
      nextDueDate: "",
      cost: "",
      notes: "",
      flockId: "",
    },
  });

  const createHealthMutation = useMutation({
    mutationFn: async (data: HealthFormData) => {
      // Keep cost as string like egg sale pattern
      await apiRequest("POST", "/api/health-records", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/health-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/activity"] });
      toast({
        title: "Success",
        description: "Health record added successfully",
      });
      healthForm.reset();
      setHealthDialogOpen(false);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to add health record",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading health records...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const vaccinations = healthRecords.filter((record: any) => record.recordType === 'vaccination');
  const medications = healthRecords.filter((record: any) => record.recordType === 'medication');
  const treatments = healthRecords.filter((record: any) => record.recordType === 'treatment');
  const checkups = healthRecords.filter((record: any) => record.recordType === 'checkup');

  // Calculate upcoming vaccinations
  const upcomingVaccinations = healthRecords.filter((record: any) => {
    if (!record.nextDueDate) return false;
    const dueDate = new Date(record.nextDueDate);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return dueDate <= nextWeek && dueDate >= new Date();
  });

  const monthlyHealthCost = healthRecords.filter((record: any) => {
    const recordDate = new Date(record.recordDate);
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    return recordDate >= monthStart;
  }).reduce((sum: number, record: any) => sum + parseFloat(record.cost || '0'), 0);

  const onSubmitHealth = (data: HealthFormData) => {
    createHealthMutation.mutate(data);
  };

  const getRecordTypeIcon = (type: string) => {
    switch (type) {
      case 'vaccination': return Syringe;
      case 'medication': return Heart;
      case 'treatment': return Activity;
      case 'checkup': return Heart;
      default: return Heart;
    }
  };

  const getRecordTypeBadge = (type: string) => {
    switch (type) {
      case 'vaccination': return { variant: "default" as const, color: "text-primary" };
      case 'medication': return { variant: "secondary" as const, color: "text-chart-2" };
      case 'treatment': return { variant: "destructive" as const, color: "text-destructive" };
      case 'checkup': return { variant: "outline" as const, color: "text-muted-foreground" };
      default: return { variant: "default" as const, color: "text-foreground" };
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-card border-b border-border px-4 py-3 md:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button 
                className="md:hidden text-muted-foreground hover:text-foreground"
                onClick={() => setSidebarOpen(true)}
                data-testid="button-mobile-menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Health Records</h2>
                <p className="text-sm text-muted-foreground">Track vaccinations, medications, and health checkups</p>
              </div>
            </div>
            
            <Dialog open={healthDialogOpen} onOpenChange={setHealthDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-health-record">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Record
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Health Record</DialogTitle>
                </DialogHeader>
                <Form {...healthForm}>
                  <form onSubmit={healthForm.handleSubmit(onSubmitHealth)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={healthForm.control}
                        name="recordDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Record Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} data-testid="input-record-date" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={healthForm.control}
                        name="flockId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Flock</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value ?? ""}>
                              <FormControl>
                                <SelectTrigger data-testid="select-flock">
                                  <SelectValue placeholder="Select flock" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {flocks?.map((flock: any) => (
                                  <SelectItem key={flock.id} value={flock.id}>
                                    {flock.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={healthForm.control}
                      name="recordType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Record Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-record-type">
                                <SelectValue placeholder="Select record type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="vaccination">Vaccination</SelectItem>
                              <SelectItem value="medication">Medication</SelectItem>
                              <SelectItem value="treatment">Treatment</SelectItem>
                              <SelectItem value="checkup">Health Checkup</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={healthForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Newcastle Disease Vaccination" data-testid="input-title" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={healthForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea {...field} value={field.value ?? ""} rows={3} data-testid="textarea-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={healthForm.control}
                        name="medicationUsed"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Medication/Vaccine</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value ?? ""}>
                              <FormControl>
                                <SelectTrigger data-testid="select-medication">
                                  <SelectValue placeholder="Select vaccine/medication" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="max-h-60 overflow-y-auto">
                                <SelectItem value="custom">Custom/Other</SelectItem>
                                
                                {/* Day 1 Vaccines */}
                                <SelectItem value="Marek's MD/IBD">Marek's MD/IBD</SelectItem>
                                <SelectItem value="Rismavac">Rismavac</SelectItem>
                                <SelectItem value="NCD+IB Live (Vitabron)">NCD+IB Live (Vitabron)</SelectItem>
                                
                                {/* Day 12-14 Vaccines */}
                                <SelectItem value="NCD+IB Live (Ceva BiJI)">NCD+IB Live (Ceva BiJI)</SelectItem>
                                
                                {/* Day 16-18 Vaccines */}
                                <SelectItem value="IBD Intermediate">IBD Intermediate</SelectItem>
                                
                                {/* Week 6-8 Vaccines */}
                                <SelectItem value="Salmonella E&T">Salmonella E&T</SelectItem>
                                <SelectItem value="Coryza (ABC) Killed">Coryza (ABC) Killed</SelectItem>
                                
                                {/* Week 8-10 Vaccines */}
                                <SelectItem value="Fowl pox">Fowl pox</SelectItem>
                                <SelectItem value="Fowl cholera">Fowl cholera</SelectItem>
                                
                                {/* Week 12-14 Vaccines */}
                                <SelectItem value="Salmonella E&T (killed)">Salmonella E&T (killed)</SelectItem>
                                <SelectItem value="Coryza (ABC) killed">Coryza (ABC) killed</SelectItem>
                                
                                {/* Week 16-18 Vaccines */}
                                <SelectItem value="NCD+IB (Killed)">NCD+IB (Killed)</SelectItem>
                                
                                {/* Common Medications */}
                                <SelectItem value="Antibiotics">Antibiotics</SelectItem>
                                <SelectItem value="Vitamins">Vitamins</SelectItem>
                                <SelectItem value="Dewormers">Dewormers</SelectItem>
                                <SelectItem value="Probiotics">Probiotics</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={healthForm.control}
                        name="dosage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Dosage/Application Method</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value ?? ""}>
                              <FormControl>
                                <SelectTrigger data-testid="select-dosage">
                                  <SelectValue placeholder="Select application method" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="S/C injection">S/C injection (Subcutaneous)</SelectItem>
                                <SelectItem value="Intramuscular injection">Intramuscular injection</SelectItem>
                                <SelectItem value="Eye drop/Drinking water">Eye drop/Drinking water</SelectItem>
                                <SelectItem value="Drinking water">Drinking water</SelectItem>
                                <SelectItem value="Coarse spray">Coarse spray</SelectItem>
                                <SelectItem value="Wing stab">Wing stab</SelectItem>
                                <SelectItem value="Subcutaneous injection">Subcutaneous injection</SelectItem>
                                <SelectItem value="Oral">Oral</SelectItem>
                                <SelectItem value="Feed mixing">Feed mixing</SelectItem>
                                <SelectItem value="Topical">Topical</SelectItem>
                                <SelectItem value="Custom">Custom/Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={healthForm.control}
                      name="administeredBy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Administered By</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value ?? ""} placeholder="Veterinarian or staff name" data-testid="input-administered-by" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={healthForm.control}
                        name="nextDueDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Next Due Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} data-testid="input-next-due-date" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={healthForm.control}
                        name="cost"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cost (KSh)</FormLabel>
                            <FormControl>
                              <Input 
                                type="text" 
                                {...field} 
                                placeholder="0.00"
                                data-testid="input-cost"
                                onChange={(e) => {
                                  // Keep as string like egg sale pattern
                                  const value = e.target.value;
                                  // Only allow digits and decimal point
                                  if (value === "" || /^\d*\.?\d*$/.test(value)) {
                                    field.onChange(value);
                                  }
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={healthForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional Notes</FormLabel>
                          <FormControl>
                            <Textarea {...field} value={field.value ?? ""} rows={2} data-testid="textarea-notes" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={createHealthMutation.isPending}
                      data-testid="button-submit-health-record"
                    >
                      {createHealthMutation.isPending ? "Adding..." : "Add Record"}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-4 md:p-6 space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card data-testid="card-total-records">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Records</p>
                    <p className="text-2xl font-bold text-foreground">{healthRecords.length}</p>
                    <p className="text-xs text-muted-foreground">All time</p>
                  </div>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Heart className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-vaccinations">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Vaccinations</p>
                    <p className="text-2xl font-bold text-foreground">{vaccinations.length}</p>
                    <p className="text-xs text-green-600">Prevention care</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Syringe className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-upcoming-due">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Due This Week</p>
                    <p className="text-2xl font-bold text-foreground">{upcomingVaccinations.length}</p>
                    <p className="text-xs text-orange-600">Upcoming vaccines</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-monthly-cost">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Monthly Cost</p>
                    <p className="text-2xl font-bold text-foreground">KSh {monthlyHealthCost.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Health expenses</p>
                  </div>
                  <div className="w-12 h-12 bg-chart-2/10 rounded-lg flex items-center justify-center">
                    <Activity className="h-6 w-6 text-chart-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Vaccinations Alert */}
          {upcomingVaccinations.length > 0 && (
            <Card data-testid="card-upcoming-vaccinations">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  <span>Upcoming Vaccinations</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingVaccinations.map((record: any) => (
                    <div key={record.id} className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                      <div>
                        <p className="font-medium text-foreground">{record.title}</p>
                        <p className="text-sm text-muted-foreground">Due: {new Date(record.nextDueDate).toLocaleDateString()}</p>
                      </div>
                      <Badge variant="secondary">Due Soon</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* KENCHIC Vaccination Program */}
          <Card data-testid="card-vaccination-program">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Syringe className="h-5 w-5 text-blue-600" />
                <span>Standard Vaccination Program (KENCHIC)</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">Recommended Layer/Kenbro vaccination schedule - Revised February 2023</p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left p-3 font-medium text-muted-foreground">Age</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Vaccine</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Disease</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Application</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr className="hover:bg-muted/50">
                      <td className="p-3 font-medium">Day 1</td>
                      <td className="p-3">
                        <div className="space-y-1">
                          <div>Marek's MD/IBD</div>
                          <div>Rismavac</div>
                          <div>NCD+IB Live (Vitabron)</div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="space-y-1">
                          <div>Marek's+NCD+IBD</div>
                          <div>Marek's</div>
                          <div>NCD+IB</div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="space-y-1">
                          <Badge variant="outline" className="text-xs">S/C injection</Badge>
                          <Badge variant="outline" className="text-xs">S/C injection</Badge>
                          <Badge variant="outline" className="text-xs">Coarse spray</Badge>
                        </div>
                      </td>
                    </tr>
                    <tr className="hover:bg-muted/50">
                      <td className="p-3 font-medium">Day 12-14</td>
                      <td className="p-3">NCD+IB Live (Ceva BiJI)</td>
                      <td className="p-3">NCD+ IB</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs">Eye drop/Drinking water</Badge>
                      </td>
                    </tr>
                    <tr className="hover:bg-muted/50">
                      <td className="p-3 font-medium">Day 16-18</td>
                      <td className="p-3">IBD Intermediate</td>
                      <td className="p-3">Gumboro</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs">Drinking water</Badge>
                      </td>
                    </tr>
                    <tr className="hover:bg-muted/50">
                      <td className="p-3 font-medium">Week 6-8</td>
                      <td className="p-3">
                        <div className="space-y-1">
                          <div>Salmonella E&T</div>
                          <div>Coryza (ABC) Killed</div>
                          <div>NCD+IB Live (Ceva BiJI)</div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="space-y-1">
                          <div>Salmonella E&T</div>
                          <div>Coryza</div>
                          <div>NCD + IB</div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="space-y-1">
                          <Badge variant="outline" className="text-xs">Intramuscular injection</Badge>
                          <Badge variant="outline" className="text-xs">S/C injection</Badge>
                          <Badge variant="outline" className="text-xs">Drinking water</Badge>
                        </div>
                      </td>
                    </tr>
                    <tr className="hover:bg-muted/50">
                      <td className="p-3 font-medium">Week 8-10</td>
                      <td className="p-3">
                        <div className="space-y-1">
                          <div>Fowl pox</div>
                          <div>Fowl cholera <span className="text-xs text-muted-foreground">(optional*)</span></div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="space-y-1">
                          <div>Pox</div>
                          <div>Fowl cholera</div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="space-y-1">
                          <Badge variant="outline" className="text-xs">Wing stab</Badge>
                          <Badge variant="outline" className="text-xs">S/C injection</Badge>
                        </div>
                      </td>
                    </tr>
                    <tr className="hover:bg-muted/50">
                      <td className="p-3 font-medium">Week 12-14</td>
                      <td className="p-3">
                        <div className="space-y-1">
                          <div>Salmonella E&T (killed)</div>
                          <div>Coryza (ABC) killed</div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="space-y-1">
                          <div>Salmonella E&T</div>
                          <div>Coryza</div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="space-y-1">
                          <Badge variant="outline" className="text-xs">Intramuscular injection</Badge>
                          <Badge variant="outline" className="text-xs">S/C injection</Badge>
                        </div>
                      </td>
                    </tr>
                    <tr className="hover:bg-muted/50">
                      <td className="p-3 font-medium">Week 16-18</td>
                      <td className="p-3">
                        <div className="space-y-1">
                          <div>NCD+IB (Killed)</div>
                          <div>Fowl cholera <span className="text-xs text-muted-foreground">(optional*)</span></div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="space-y-1">
                          <div>NCD+IB</div>
                          <div>Fowl cholera</div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="space-y-1">
                          <Badge variant="outline" className="text-xs">Intramuscular injection</Badge>
                          <Badge variant="outline" className="text-xs">Subcutaneous injection</Badge>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Note:</strong> *Optional vaccines depend on disease history. Introduced Coryza and ND+IB killed vaccinations. 
                    Please visit Kenchic poultry centres for any clarification.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="all-records" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all-records">All Records</TabsTrigger>
              <TabsTrigger value="vaccinations">Vaccinations</TabsTrigger>
              <TabsTrigger value="medications">Medications</TabsTrigger>
              <TabsTrigger value="treatments">Treatments</TabsTrigger>
            </TabsList>

            <TabsContent value="all-records">
              <Card data-testid="card-all-health-records">
                <CardHeader>
                  <CardTitle>All Health Records</CardTitle>
                </CardHeader>
                <CardContent>
                  {healthRecords.length === 0 ? (
                    <div className="text-center py-8">
                      <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No health records found</p>
                      <p className="text-sm text-muted-foreground mt-2">Start tracking health activities</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left p-2 font-medium text-muted-foreground">Date</th>
                            <th className="text-left p-2 font-medium text-muted-foreground">Type</th>
                            <th className="text-left p-2 font-medium text-muted-foreground">Title</th>
                            <th className="text-left p-2 font-medium text-muted-foreground">Medication</th>
                            <th className="text-left p-2 font-medium text-muted-foreground">Next Due</th>
                            <th className="text-left p-2 font-medium text-muted-foreground">Cost</th>
                          </tr>
                        </thead>
                        <tbody>
                          {healthRecords.map((record: any) => {
                            const TypeIcon = getRecordTypeIcon(record.recordType);
                            const badgeStyle = getRecordTypeBadge(record.recordType);
                            
                            return (
                              <tr key={record.id} className="border-b border-border/50" data-testid={`row-health-record-${record.id}`}>
                                <td className="p-2">{new Date(record.recordDate).toLocaleDateString()}</td>
                                <td className="p-2">
                                  <Badge variant={badgeStyle.variant} className="capitalize">
                                    {record.recordType}
                                  </Badge>
                                </td>
                                <td className="p-2 font-medium">{record.title}</td>
                                <td className="p-2">{record.medicationUsed || "-"}</td>
                                <td className="p-2">
                                  {record.nextDueDate ? new Date(record.nextDueDate).toLocaleDateString() : "-"}
                                </td>
                                <td className="p-2">
                                  {record.cost ? `KSh ${parseFloat(record.cost).toLocaleString()}` : "-"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="vaccinations">
              <Card data-testid="card-vaccinations-only">
                <CardHeader>
                  <CardTitle>Vaccination Records</CardTitle>
                </CardHeader>
                <CardContent>
                  {vaccinations.length === 0 ? (
                    <div className="text-center py-8">
                      <Syringe className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No vaccination records found</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {vaccinations.map((record: any) => (
                        <Card key={record.id} data-testid={`card-vaccination-${record.id}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="font-semibold">{record.title}</h3>
                              <Badge variant="default">Vaccination</Badge>
                            </div>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Date:</span>
                                <span>{new Date(record.recordDate).toLocaleDateString()}</span>
                              </div>
                              {record.medicationUsed && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Vaccine:</span>
                                  <span>{record.medicationUsed}</span>
                                </div>
                              )}
                              {record.nextDueDate && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Next Due:</span>
                                  <span>{new Date(record.nextDueDate).toLocaleDateString()}</span>
                                </div>
                              )}
                              {record.cost && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Cost:</span>
                                  <span>KSh {parseFloat(record.cost).toLocaleString()}</span>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="medications">
              <Card data-testid="card-medications-only">
                <CardHeader>
                  <CardTitle>Medication Records</CardTitle>
                </CardHeader>
                <CardContent>
                  {medications.length === 0 ? (
                    <div className="text-center py-8">
                      <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No medication records found</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {medications.map((record: any) => (
                        <div key={record.id} className="p-4 border border-border rounded-lg" data-testid={`medication-${record.id}`}>
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold">{record.title}</h3>
                            <Badge variant="secondary">Medication</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{record.description}</p>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Date: </span>
                              <span>{new Date(record.recordDate).toLocaleDateString()}</span>
                            </div>
                            {record.medicationUsed && (
                              <div>
                                <span className="text-muted-foreground">Medication: </span>
                                <span>{record.medicationUsed}</span>
                              </div>
                            )}
                            {record.dosage && (
                              <div>
                                <span className="text-muted-foreground">Dosage: </span>
                                <span>{record.dosage}</span>
                              </div>
                            )}
                            {record.cost && (
                              <div>
                                <span className="text-muted-foreground">Cost: </span>
                                <span>KSh {parseFloat(record.cost).toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="treatments">
              <Card data-testid="card-treatments-only">
                <CardHeader>
                  <CardTitle>Treatment Records</CardTitle>
                </CardHeader>
                <CardContent>
                  {treatments.length === 0 ? (
                    <div className="text-center py-8">
                      <Activity className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No treatment records found</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {treatments.map((record: any) => (
                        <div key={record.id} className="p-4 border border-destructive/20 rounded-lg bg-destructive/5" data-testid={`treatment-${record.id}`}>
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold">{record.title}</h3>
                            <Badge variant="destructive">Treatment</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{record.description}</p>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Date: </span>
                              <span>{new Date(record.recordDate).toLocaleDateString()}</span>
                            </div>
                            {record.administeredBy && (
                              <div>
                                <span className="text-muted-foreground">Administered by: </span>
                                <span>{record.administeredBy}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
