import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useFarmContext } from "@/contexts/FarmContext";
import { Egg, Skull, Wheat, Coins } from "lucide-react";
import { z } from "zod";

const actions = [
  {
    id: "record-eggs",
    title: "Record Eggs",
    description: "Daily egg collection",
    icon: Egg,
    color: "bg-chart-3/10 text-chart-3",
  },
  {
    id: "add-mortality",
    title: "Record Mortality",
    description: "Track bird losses",
    icon: Skull,
    color: "bg-red-100 text-red-600",
  },
  {
    id: "update-feed",
    title: "Update Feed",
    description: "Log feed consumption",
    icon: Wheat,
    color: "bg-orange-100 text-orange-600",
  },
  {
    id: "record-sale",
    title: "Record Sale",
    description: "Log egg sales",
    icon: Coins,
    color: "bg-green-100 text-green-600",
  },
];

// Quick action schemas
const eggRecordSchema = z.object({
  flockId: z.string().min(1, "Flock selection is required"),
  eggsCollected: z.number().min(0),
  brokenEggs: z.number().min(0).default(0),
  recordDate: z.string().min(1),
  notes: z.string().optional(),
});

const mortalitySchema = z.object({
  flockId: z.string().min(1, "Flock selection is required"),
  recordDate: z.string().min(1),
  mortalityCount: z.number().min(0),
  mortalityReason: z.string().min(1, "Reason is required"),
  notes: z.string().optional(),
});

const feedUpdateSchema = z.object({
  flockId: z.string().min(1, "Flock selection is required"),
  recordDate: z.string().min(1),
  feedConsumed: z.string().min(1),
  feedType: z.string().min(1),
  notes: z.string().optional(),
});

const saleRecordSchema = z.object({
  saleDate: z.string().min(1),
  customerName: z.string().min(1),
  cratesSold: z.number().min(1),
  pricePerCrate: z.number().positive(),
  totalAmount: z.number().positive(),
  paymentStatus: z.enum(["pending", "paid", "overdue"]),
  notes: z.string().optional(),
});

export default function QuickActions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeFarmId, hasActiveFarm } = useFarmContext();
  const [eggDialogOpen, setEggDialogOpen] = useState(false);
  const [mortalityDialogOpen, setMortalityDialogOpen] = useState(false);
  const [feedDialogOpen, setFeedDialogOpen] = useState(false);
  const [saleDialogOpen, setSaleDialogOpen] = useState(false);

  const { data: flocks = [] } = useQuery<any[]>({
    queryKey: ["/api/flocks"],
  });

  // Forms
  const eggForm = useForm({
    resolver: zodResolver(eggRecordSchema),
    defaultValues: { flockId: "", eggsCollected: 0, brokenEggs: 0, recordDate: new Date().toISOString().split('T')[0], notes: "" },
  });

  const mortalityForm = useForm({
    resolver: zodResolver(mortalitySchema),
    defaultValues: { flockId: "", recordDate: new Date().toISOString().split('T')[0], mortalityCount: 0, mortalityReason: "", notes: "" },
  });

  const feedForm = useForm({
    resolver: zodResolver(feedUpdateSchema),
    defaultValues: { flockId: "", recordDate: new Date().toISOString().split('T')[0], feedConsumed: "", feedType: "", notes: "" },
  });

  const saleForm = useForm({
    resolver: zodResolver(saleRecordSchema),
    defaultValues: { 
      saleDate: new Date().toISOString().split('T')[0], 
      customerName: "", 
      cratesSold: 1, 
      pricePerCrate: 0, 
      totalAmount: 0,
      paymentStatus: "pending" as const,
      notes: "" 
    },
  });

  // Farm context guard helper
  const handleFormSubmit = (callback: () => void) => {
    if (!hasActiveFarm) {
      toast({
        title: "Farm Required",
        description: "Please select an active farm before submitting records.",
        variant: "destructive",
      });
      return;
    }
    callback();
  };

  // Mutations
  const createEggRecord = useMutation({
    mutationFn: async (data: z.infer<typeof eggRecordSchema>) => {
      const recordData = {
        flockId: data.flockId,
        recordDate: data.recordDate,
        eggsCollected: data.eggsCollected,
        brokenEggs: data.brokenEggs,
        cratesProduced: Math.floor(data.eggsCollected / 30),
        mortalityCount: 0, mortalityReason: null, feedConsumed: null, feedType: null,
        temperature: null, lightingHours: null, averageWeight: null, sampleSize: 0,
        notes: data.notes || "",
        farmId: activeFarmId,
      };
      console.log("Submitting quick egg record:", recordData);
      await apiRequest("POST", "/api/daily-records", recordData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/activity"] });
      toast({ title: "Success", description: "Egg record created" });
      eggForm.reset(); setEggDialogOpen(false);
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: "Failed to record eggs. Please try again.", 
        variant: "destructive" 
      });
      console.error("Failed to create egg record:", error);
    },
  });

  const createMortalityRecord = useMutation({
    mutationFn: async (data: z.infer<typeof mortalitySchema>) => {
      const recordData = {
        flockId: data.flockId,
        recordDate: data.recordDate,
        eggsCollected: 0, brokenEggs: 0, cratesProduced: 0,
        mortalityCount: data.mortalityCount,
        mortalityReason: data.mortalityReason,
        feedConsumed: null, feedType: null, temperature: null, lightingHours: null,
        averageWeight: null, sampleSize: 0, notes: data.notes || "",
        farmId: activeFarmId,
      };
      await apiRequest("POST", "/api/daily-records", recordData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/activity"] });
      toast({ title: "Success", description: "Mortality record created" });
      mortalityForm.reset(); setMortalityDialogOpen(false);
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: "Failed to record mortality. Please try again.", 
        variant: "destructive" 
      });
      console.error("Failed to create mortality record:", error);
    },
  });

  const createFeedRecord = useMutation({
    mutationFn: async (data: z.infer<typeof feedUpdateSchema>) => {
      const recordData = {
        flockId: data.flockId,
        recordDate: data.recordDate,
        eggsCollected: 0, brokenEggs: 0, cratesProduced: 0,
        mortalityCount: 0, mortalityReason: null,
        feedConsumed: data.feedConsumed,
        feedType: data.feedType,
        temperature: null, lightingHours: null, averageWeight: null, sampleSize: 0,
        notes: data.notes || "",
        farmId: activeFarmId,
      };
      await apiRequest("POST", "/api/daily-records", recordData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/activity"] });
      toast({ title: "Success", description: "Feed record updated" });
      feedForm.reset(); setFeedDialogOpen(false);
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: "Failed to update feed record. Please try again.", 
        variant: "destructive" 
      });
      console.error("Failed to create feed record:", error);
    },
  });

  const createSaleRecord = useMutation({
    mutationFn: async (data: z.infer<typeof saleRecordSchema>) => {
      const saleData = { ...data, farmId: activeFarmId };
      await apiRequest("POST", "/api/sales", saleData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sales?farmId=${activeFarmId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/activity"] });
      toast({ title: "Success", description: "Sale recorded" });
      saleForm.reset(); setSaleDialogOpen(false);
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: "Failed to record sale. Please try again.", 
        variant: "destructive" 
      });
      console.error("Failed to create sale record:", error);
    },
  });

  // Watch for auto-calculation in sale form
  const cratesSold = saleForm.watch("cratesSold");
  const pricePerCrate = saleForm.watch("pricePerCrate");
  
  useEffect(() => {
    if (cratesSold && pricePerCrate && !isNaN(Number(pricePerCrate))) {
      const total = Number((cratesSold * Number(pricePerCrate)).toFixed(2));
      saleForm.setValue("totalAmount", total);
    }
  }, [cratesSold, pricePerCrate, saleForm]);

  return (
    <Card data-testid="card-quick-actions">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {actions.map((action) => {
            const Icon = action.icon;
            const getDialogContent = () => {
              switch (action.id) {
                case "record-eggs":
                  return (
                    <Dialog open={eggDialogOpen} onOpenChange={setEggDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" className="w-full flex items-center space-x-3 p-3 h-auto justify-start hover:bg-muted" data-testid={`button-${action.id}`}>
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${action.color}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-medium text-foreground">{action.title}</p>
                            <p className="text-xs text-muted-foreground">{action.description}</p>
                          </div>
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Record Eggs</DialogTitle>
                          <DialogDescription>Record today's egg collection</DialogDescription>
                        </DialogHeader>
                        <Form {...eggForm}>
                          <form onSubmit={eggForm.handleSubmit((data) => handleFormSubmit(() => createEggRecord.mutate(data)))} className="space-y-4">
                            <FormField control={eggForm.control} name="flockId" render={({ field }) => (
                              <FormItem><FormLabel>Flock</FormLabel><FormControl>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <SelectTrigger data-testid="select-egg-flock"><SelectValue placeholder="Select flock" /></SelectTrigger>
                                  <SelectContent>
                                    {flocks.map((flock) => (
                                      <SelectItem key={flock.id} value={flock.id}>
                                        {flock.name} ({flock.currentCount} birds)
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={eggForm.control} name="recordDate" render={({ field }) => (
                              <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} data-testid="input-egg-record-date" /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={eggForm.control} name="eggsCollected" render={({ field }) => (
                              <FormItem><FormLabel>Eggs Collected</FormLabel><FormControl><Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} data-testid="input-eggs-collected" /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={eggForm.control} name="brokenEggs" render={({ field }) => (
                              <FormItem><FormLabel>Broken Eggs</FormLabel><FormControl><Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} data-testid="input-broken-eggs" /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={eggForm.control} name="notes" render={({ field }) => (
                              <FormItem><FormLabel>Notes</FormLabel><FormControl><Input {...field} placeholder="Optional notes" data-testid="input-egg-notes" /></FormControl><FormMessage /></FormItem>
                            )} />
                            <Button type="submit" disabled={createEggRecord.isPending} className="w-full" data-testid="button-submit-egg-record">
                              {createEggRecord.isPending ? "Recording..." : "Record Eggs"}
                            </Button>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  );
                case "add-mortality":
                  return (
                    <Dialog open={mortalityDialogOpen} onOpenChange={setMortalityDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" className="w-full flex items-center space-x-3 p-3 h-auto justify-start hover:bg-muted" data-testid={`button-${action.id}`}>
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${action.color}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-medium text-foreground">{action.title}</p>
                            <p className="text-xs text-muted-foreground">{action.description}</p>
                          </div>
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Record Mortality</DialogTitle>
                          <DialogDescription>Record bird losses and reason</DialogDescription>
                        </DialogHeader>
                        <Form {...mortalityForm}>
                          <form onSubmit={mortalityForm.handleSubmit((data) => handleFormSubmit(() => createMortalityRecord.mutate(data)))} className="space-y-4">
                            <FormField control={mortalityForm.control} name="flockId" render={({ field }) => (
                              <FormItem><FormLabel>Flock</FormLabel><FormControl>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <SelectTrigger data-testid="select-mortality-flock"><SelectValue placeholder="Select flock" /></SelectTrigger>
                                  <SelectContent>
                                    {flocks.map((flock) => (
                                      <SelectItem key={flock.id} value={flock.id}>
                                        {flock.name} ({flock.currentCount} birds)
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={mortalityForm.control} name="recordDate" render={({ field }) => (
                              <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} data-testid="input-mortality-date" /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={mortalityForm.control} name="mortalityCount" render={({ field }) => (
                              <FormItem><FormLabel>Number of Birds Lost</FormLabel><FormControl><Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} data-testid="input-mortality-count" /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={mortalityForm.control} name="mortalityReason" render={({ field }) => (
                              <FormItem><FormLabel>Reason</FormLabel><FormControl>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <SelectTrigger data-testid="select-mortality-reason"><SelectValue placeholder="Select reason" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="disease">Disease</SelectItem>
                                    <SelectItem value="predator">Predator Attack</SelectItem>
                                    <SelectItem value="accident">Accident</SelectItem>
                                    <SelectItem value="old-age">Old Age</SelectItem>
                                    <SelectItem value="unknown">Unknown</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={mortalityForm.control} name="notes" render={({ field }) => (
                              <FormItem><FormLabel>Additional Notes</FormLabel><FormControl><Textarea {...field} placeholder="Additional details" data-testid="textarea-mortality-notes" /></FormControl><FormMessage /></FormItem>
                            )} />
                            <Button type="submit" disabled={createMortalityRecord.isPending} className="w-full" data-testid="button-submit-mortality">
                              {createMortalityRecord.isPending ? "Recording..." : "Record Mortality"}
                            </Button>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  );
                case "update-feed":
                  return (
                    <Dialog open={feedDialogOpen} onOpenChange={setFeedDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" className="w-full flex items-center space-x-3 p-3 h-auto justify-start hover:bg-muted" data-testid={`button-${action.id}`}>
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${action.color}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-medium text-foreground">{action.title}</p>
                            <p className="text-xs text-muted-foreground">{action.description}</p>
                          </div>
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Update Feed</DialogTitle>
                          <DialogDescription>Log feed consumption for today</DialogDescription>
                        </DialogHeader>
                        <Form {...feedForm}>
                          <form onSubmit={feedForm.handleSubmit((data) => handleFormSubmit(() => createFeedRecord.mutate(data)))} className="space-y-4">
                            <FormField control={feedForm.control} name="flockId" render={({ field }) => (
                              <FormItem><FormLabel>Flock</FormLabel><FormControl>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <SelectTrigger data-testid="select-feed-flock"><SelectValue placeholder="Select flock" /></SelectTrigger>
                                  <SelectContent>
                                    {flocks.map((flock) => (
                                      <SelectItem key={flock.id} value={flock.id}>
                                        {flock.name} ({flock.currentCount} birds)
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={feedForm.control} name="recordDate" render={({ field }) => (
                              <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} data-testid="input-feed-date" /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={feedForm.control} name="feedConsumed" render={({ field }) => (
                              <FormItem><FormLabel>Feed Consumed (kg)</FormLabel><FormControl><Input {...field} placeholder="e.g., 520" data-testid="input-feed-consumed" /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={feedForm.control} name="feedType" render={({ field }) => (
                              <FormItem><FormLabel>Feed Type</FormLabel><FormControl>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <SelectTrigger data-testid="select-feed-type"><SelectValue placeholder="Select feed type" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="layer-mash">Layer Mash</SelectItem>
                                    <SelectItem value="layer-pellets">Layer Pellets</SelectItem>
                                    <SelectItem value="grower-mash">Grower Mash</SelectItem>
                                    <SelectItem value="starter-mash">Starter Mash</SelectItem>
                                    <SelectItem value="wheat">Wheat</SelectItem>
                                    <SelectItem value="maize">Maize</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={feedForm.control} name="notes" render={({ field }) => (
                              <FormItem><FormLabel>Notes</FormLabel><FormControl><Input {...field} placeholder="Additional details" data-testid="input-feed-notes" /></FormControl><FormMessage /></FormItem>
                            )} />
                            <Button type="submit" disabled={createFeedRecord.isPending} className="w-full" data-testid="button-submit-feed">
                              {createFeedRecord.isPending ? "Updating..." : "Update Feed"}
                            </Button>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  );
                case "record-sale":
                  return (
                    <Dialog open={saleDialogOpen} onOpenChange={setSaleDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" className="w-full flex items-center space-x-3 p-3 h-auto justify-start hover:bg-muted" data-testid={`button-${action.id}`}>
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${action.color}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-medium text-foreground">{action.title}</p>
                            <p className="text-xs text-muted-foreground">{action.description}</p>
                          </div>
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Record Sale</DialogTitle>
                          <DialogDescription>Record egg sales with customer details</DialogDescription>
                        </DialogHeader>
                        <Form {...saleForm}>
                          <form onSubmit={saleForm.handleSubmit((data) => handleFormSubmit(() => createSaleRecord.mutate(data)))} className="space-y-4">
                            <FormField control={saleForm.control} name="saleDate" render={({ field }) => (
                              <FormItem><FormLabel>Sale Date</FormLabel><FormControl><Input type="date" {...field} data-testid="input-sale-date" /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={saleForm.control} name="customerName" render={({ field }) => (
                              <FormItem><FormLabel>Customer Name</FormLabel><FormControl><Input {...field} placeholder="Customer name" data-testid="input-customer-name" /></FormControl><FormMessage /></FormItem>
                            )} />
                            <div className="grid grid-cols-2 gap-4">
                              <FormField control={saleForm.control} name="cratesSold" render={({ field }) => (
                                <FormItem><FormLabel>Crates Sold</FormLabel><FormControl><Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} data-testid="input-crates-sold" /></FormControl><FormMessage /></FormItem>
                              )} />
                              <FormField control={saleForm.control} name="pricePerCrate" render={({ field }) => (
                                <FormItem><FormLabel>Price per Crate</FormLabel><FormControl><Input type="number" step="0.01" {...field} placeholder="550.00" data-testid="input-price-per-crate" /></FormControl><FormMessage /></FormItem>
                              )} />
                            </div>
                            <FormField control={saleForm.control} name="totalAmount" render={({ field }) => (
                              <FormItem><FormLabel>Total Amount</FormLabel><FormControl><Input type="number" step="0.01" {...field} placeholder="Auto-calculated" className="bg-muted" readOnly data-testid="input-total-amount" /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={saleForm.control} name="paymentStatus" render={({ field }) => (
                              <FormItem><FormLabel>Payment Status</FormLabel><FormControl>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <SelectTrigger data-testid="select-payment-status"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="paid">Paid</SelectItem>
                                    <SelectItem value="overdue">Overdue</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={saleForm.control} name="notes" render={({ field }) => (
                              <FormItem><FormLabel>Notes</FormLabel><FormControl><Input {...field} placeholder="Additional notes" data-testid="input-sale-notes" /></FormControl><FormMessage /></FormItem>
                            )} />
                            <Button type="submit" disabled={createSaleRecord.isPending} className="w-full" data-testid="button-submit-sale">
                              {createSaleRecord.isPending ? "Recording..." : "Record Sale"}
                            </Button>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  );
                default:
                  return (
                    <Button
                      key={action.id}
                      variant="ghost"
                      className="w-full flex items-center space-x-3 p-3 h-auto justify-start hover:bg-muted"
                      data-testid={`button-${action.id}`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${action.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-foreground">{action.title}</p>
                        <p className="text-xs text-muted-foreground">{action.description}</p>
                      </div>
                    </Button>
                  );
              }
            };
            
            return <div key={action.id}>{getDialogContent()}</div>;
          })}
        </div>
      </CardContent>
    </Card>
  );
}
