import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Baby, Thermometer, Sun, Utensils, AlertCircle, Plus, Edit, Eye, Trash2, Download, Filter, Scale } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Menu } from "lucide-react";
import SimpleBroodingForm from "@/components/forms/simple-brooding-form";
import FlockForm from "@/components/forms/flock-form";
import SimpleFlockForm from "@/components/forms/simple-flock-form";

export default function ChickBrooding() {
  const { toast } = useToast();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const [flockDialogOpen, setFlockDialogOpen] = useState(false);
  const [flockDetailsOpen, setFlockDetailsOpen] = useState(false);
  const [flockEditOpen, setFlockEditOpen] = useState(false);
  const [selectedFlock, setSelectedFlock] = useState<any>(null);
  const queryClient = useQueryClient();

  // Handlers for flock actions
  const handleViewDetails = (flock: any) => {
    setSelectedFlock(flock);
    setFlockDetailsOpen(true);
  };

  const handleEditFlock = (flock: any) => {
    setSelectedFlock(flock);
    setFlockEditOpen(true);
  };

  // Deactivate flock mutation (admin-only)
  const deactivateFlockMutation = useMutation({
    mutationFn: async (flockId: string) => {
      return apiRequest('PATCH', `/api/flocks/${flockId}/deactivate`);
    },
    onSuccess: () => {
      toast({
        title: "Flock Deactivated",
        description: "The flock has been successfully deactivated and hidden from the list.",
      });
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/flocks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/flocks", { includeDeactivated: true }] });
    },
    onError: (error: any) => {
      toast({
        title: "Deactivation Failed",
        description: error?.message || "Failed to deactivate flock. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDeactivateFlock = (flockId: string, flockName: string) => {
    deactivateFlockMutation.mutate(flockId);
  };

  // Reactivate flock mutation (admin-only)
  const reactivateFlockMutation = useMutation({
    mutationFn: async (flockId: string) => {
      return apiRequest('PATCH', `/api/flocks/${flockId}/reactivate`);
    },
    onSuccess: () => {
      toast({
        title: "Flock Reactivated",
        description: "The flock has been successfully reactivated and restored to active status.",
      });
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/flocks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/flocks", { includeDeactivated: true }] });
    },
    onError: (error: any) => {
      toast({
        title: "Reactivation Failed",
        description: error?.message || "Failed to reactivate flock. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleReactivateFlock = (flockId: string, flockName: string) => {
    reactivateFlockMutation.mutate(flockId);
  };

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

  const { data: flocks = [], error: flocksError } = useQuery<any[]>({
    queryKey: ["/api/flocks"],
    enabled: isAuthenticated,
  });

  // Query for deactivated flocks (admin only)
  const { data: deactivatedFlocks = [], error: deactivatedFlocksError } = useQuery<any[]>({
    queryKey: ["/api/flocks", { includeDeactivated: true }],
    enabled: isAuthenticated && user?.role === 'admin',
  });

  const { data: dailyRecords = [], error: recordsError } = useQuery<any[]>({
    queryKey: ["/api/daily-records"],
    enabled: isAuthenticated,
  });

  // Handle unauthorized errors
  useEffect(() => {
    if ((flocksError && isUnauthorizedError(flocksError)) || 
        (recordsError && isUnauthorizedError(recordsError)) || 
        (deactivatedFlocksError && isUnauthorizedError(deactivatedFlocksError))) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [flocksError, recordsError, deactivatedFlocksError, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading chick brooding data...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Filter flocks to show only brooding flocks
  const broodingFlocks = flocks.filter((flock: any) => flock.status === 'brooding');
  const broodingRecords = dailyRecords.filter((record: any) => 
    record.temperature || record.lightingHours
  ) || [];

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
                <h2 className="text-xl font-semibold text-foreground">Chick Brooding</h2>
                <p className="text-sm text-muted-foreground">Monitor temperature, lighting, and feed for brooding chicks</p>
              </div>
            </div>
            
            <Dialog open={recordDialogOpen} onOpenChange={setRecordDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-brooding-record">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Record
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Brooding Record</DialogTitle>
                  <DialogDescription>
                    Record daily brooding data including temperature, lighting, feed, and chick mortality.
                  </DialogDescription>
                </DialogHeader>
                <SimpleBroodingForm onSuccess={() => setRecordDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-4 md:p-6 space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card data-testid="card-active-broods">
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Baby className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{broodingFlocks.length}</p>
                    <p className="text-sm text-muted-foreground">Active Broods</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-avg-temperature">
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Thermometer className="h-8 w-8 text-chart-5" />
                  <div>
                    <p className="text-2xl font-bold">32.5°C</p>
                    <p className="text-sm text-muted-foreground">Avg Temperature</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-lighting-hours">
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Sun className="h-8 w-8 text-chart-3" />
                  <div>
                    <p className="text-2xl font-bold">18h</p>
                    <p className="text-sm text-muted-foreground">Daily Lighting</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-feed-consumption">
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Utensils className="h-8 w-8 text-chart-2" />
                  <div>
                    <p className="text-2xl font-bold">125kg</p>
                    <p className="text-sm text-muted-foreground">Daily Feed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="flocks" className="space-y-4">
            <TabsList>
              <TabsTrigger value="flocks">Brooding Flocks</TabsTrigger>
              <TabsTrigger value="records">Daily Records</TabsTrigger>
              <TabsTrigger value="schedule">Brooding Schedule</TabsTrigger>
              {user?.role === 'admin' && (
                <TabsTrigger value="deactivated">Deactivated Flocks</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="flocks">
              <Card data-testid="card-brooding-flocks">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Brooding Flocks</CardTitle>
                    <Dialog open={flockDialogOpen} onOpenChange={setFlockDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" data-testid="button-add-flock-header">
                          <Plus className="h-4 w-4 mr-2" />
                          Add New Flock
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Create New Flock</DialogTitle>
                          <DialogDescription>
                            Add a new flock to your farm for tracking throughout its lifecycle.
                          </DialogDescription>
                        </DialogHeader>
                        <SimpleFlockForm onSuccess={() => setFlockDialogOpen(false)} />
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {broodingFlocks.length === 0 ? (
                    <div className="text-center py-8">
                      <Baby className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No brooding flocks currently active</p>
                      <p className="text-sm text-muted-foreground mt-2">Click "Add New Flock" above to get started</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {broodingFlocks.map((flock: any) => (
                        <Card key={flock.id} data-testid={`card-flock-${flock.id}`}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-semibold">{flock.name}</h3>
                              <Badge variant="secondary">Week {Math.floor((new Date().getTime() - new Date(flock.hatchDate).getTime()) / (1000 * 60 * 60 * 24 * 7))}</Badge>
                            </div>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Breed:</span>
                                <span>{flock.breed}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Current Count:</span>
                                <span>{flock.currentCount}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Hatch Date:</span>
                                <span>{new Date(flock.hatchDate).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <div className="flex gap-2 mt-4">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="flex-1" 
                                onClick={() => handleViewDetails(flock)}
                                data-testid={`button-view-flock-${flock.id}`}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </Button>
                              <Button 
                                size="sm" 
                                className="flex-1" 
                                onClick={() => handleEditFlock(flock)}
                                data-testid={`button-edit-flock-${flock.id}`}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </Button>
                              {user?.role === 'admin' && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button 
                                      size="sm" 
                                      variant="destructive"
                                      disabled={deactivateFlockMutation.isPending}
                                      data-testid={`button-deactivate-flock-${flock.id}`}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      {deactivateFlockMutation.isPending ? "Deactivating..." : "Deactivate"}
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <div className="flex items-center space-x-2">
                                        <AlertCircle className="h-6 w-6 text-destructive" />
                                        <AlertDialogTitle className="text-destructive">
                                          ⚠️ Permanently Deactivate Flock
                                        </AlertDialogTitle>
                                      </div>
                                      <AlertDialogDescription className="space-y-3 pt-2">
                                        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                                          <p className="font-semibold text-destructive-foreground">
                                            Warning: This is a destructive action!
                                          </p>
                                        </div>
                                        <p>
                                          You are about to <strong>permanently deactivate</strong> the flock <strong>"{flock.name}"</strong>.
                                        </p>
                                        <div className="space-y-2 text-sm">
                                          <p className="flex items-start space-x-2">
                                            <span className="text-destructive font-bold">•</span>
                                            <span>This flock will be <strong>hidden</strong> from all active flock lists</span>
                                          </p>
                                          <p className="flex items-start space-x-2">
                                            <span className="text-destructive font-bold">•</span>
                                            <span>All historical data will be <strong>preserved</strong> but not easily accessible</span>
                                          </p>
                                          <p className="flex items-start space-x-2">
                                            <span className="text-destructive font-bold">•</span>
                                            <span>Only administrators can <strong>recover</strong> this flock later</span>
                                          </p>
                                          <p className="flex items-start space-x-2">
                                            <span className="text-destructive font-bold">•</span>
                                            <span>Farm staff will <strong>lose access</strong> to this flock's data</span>
                                          </p>
                                        </div>
                                        <p className="text-muted-foreground text-sm mt-4">
                                          Consider if you really need to deactivate this flock. This action should only be used for permanently discontinued flocks.
                                        </p>
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0">
                                      <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => handleDeactivateFlock(flock.id, flock.name)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto"
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Yes, Permanently Deactivate
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
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

            <TabsContent value="records">
              <Card data-testid="card-brooding-records">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Recent Brooding Records</CardTitle>
                    <Dialog open={recordDialogOpen} onOpenChange={setRecordDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" data-testid="button-add-record">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Record
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Add Brooding Record</DialogTitle>
                          <DialogDescription>
                            Record daily brooding data including temperature, lighting, feed, and chick mortality.
                          </DialogDescription>
                        </DialogHeader>
                        <SimpleBroodingForm onSuccess={() => setRecordDialogOpen(false)} />
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {broodingRecords.length === 0 ? (
                    <div className="text-center py-8">
                      <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No brooding records found</p>
                      <p className="text-sm text-muted-foreground mt-2">Start recording temperature, lighting, and feed data</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left p-2 font-medium text-muted-foreground">Date</th>
                            <th className="text-left p-2 font-medium text-muted-foreground">Temperature</th>
                            <th className="text-left p-2 font-medium text-muted-foreground">Lighting</th>
                            <th className="text-left p-2 font-medium text-muted-foreground">Feed</th>
                            <th className="text-left p-2 font-medium text-muted-foreground">Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {broodingRecords.slice(0, 10).map((record: any) => (
                            <tr key={record.id} className="border-b border-border/50" data-testid={`row-record-${record.id}`}>
                              <td className="p-2">{new Date(record.recordDate).toLocaleDateString()}</td>
                              <td className="p-2">{record.temperature ? `${record.temperature}°C` : '-'}</td>
                              <td className="p-2">{record.lightingHours ? `${record.lightingHours}h` : '-'}</td>
                              <td className="p-2">{record.feedConsumed ? `${record.feedConsumed}kg` : '-'}</td>
                              <td className="p-2 max-w-xs truncate">{record.notes || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="schedule">
              <Card data-testid="card-brooding-schedule">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Brooding Schedule Guidelines</CardTitle>
                      <p className="text-sm text-muted-foreground mt-2">
                        Comprehensive week-by-week brooding management guide for optimal chick development and health
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        const scheduleData = [
                          ['Week', 'Temperature (°C)', 'Lighting (hours)', 'Feed (g/bird/day)', 'Feed Type', 'Expected Weight (g)', 'Key Notes'],
                          ['Week 1', '35-32°C', '24', '12g', 'Chick and Duck Mash', '40-60g', 'Critical growth period - monitor closely'],
                          ['Week 2', '32-29°C', '20', '18g', 'Chick and Duck Mash', '85-120g', 'Rapid growth phase begins'],
                          ['Week 3', '29-26°C', '16', '25g', 'Chick and Duck Mash', '150-200g', 'Feed transition period'],
                          ['Week 4', '26-23°C', '14', '31g', 'Chick and Duck Mash', '220-300g', 'Feather development peak'],
                          ['Week 5', '23-21°C', '14', '38g', 'Chick and Duck Mash', '380-400g', 'Steady growth continues'],
                          ['Week 6', '21°C', '14', '41g', 'Chick and Duck Mash', '470-500g', 'Prepare for grower phase'],
                          ['Week 7', '21°C', '14', '45g', 'Chick and Duck Mash', '560-600g', 'Transition preparation'],
                          ['Week 8', '21°C', '14', '49g', 'Gradual change to Growers Mash', '650g', 'Begin grower feed transition'],
                          ['Week 9', '21°C', '14', '52g', 'Growers Mash', '740-780g', 'Full grower feed'],
                          ['Week 10', '21°C', '14', '60g', 'Growers Mash', '830-870g', 'Rapid growth phase'],
                          ['Week 11', '21°C', '14', '70g', 'Growers Mash', '920-980g', 'Peak growth period'],
                          ['Week 12', '21°C', '14', '75g', 'Growers Mash', '1010-1050g', 'Consistent growth'],
                          ['Week 13', '21°C', '14', '80g', 'Growers Mash', '1100-1140g', 'Continued development'],
                          ['Week 14', '21°C', '14', '85g', 'Growers Mash', '1185-1230g', 'Pre-layer development'],
                          ['Week 15', '21°C', '14', '92g', 'Growers Mash', '1270-1320g', 'Final grower phase'],
                          ['Week 16', '21°C', '14', '100g', 'Gradual change to Layers Mash', '1355-1410g', 'Begin layer feed transition'],
                          ['Week 17', '21°C', '14', '107g', 'Layers Mash', '1440-1500g', 'Layer feed establishment'],
                          ['Week 18', '21°C', '14', '114g', 'Layers Mash', '1530-1600g', 'Pre-laying preparation'],
                          ['Week 19', '21°C', '14', '118g', 'Layers Mash', '1580-1680g', 'Approaching laying'],
                          ['Week 20', '21°C', '14', '120g', 'Layers Mash', '1645-1750g', 'Ready for egg production']
                        ];
                        const csvContent = scheduleData.map(row => row.join(',')).join('\n');
                        const blob = new Blob([csvContent], { type: 'text/csv' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = 'brooding-schedule-guidelines.csv';
                        link.click();
                        URL.revokeObjectURL(url);
                      }}
                      data-testid="button-export-schedule"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Week-by-Week Overview Table */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <Baby className="h-5 w-5 mr-2" />
                      Week-by-Week Overview
                    </h3>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="min-w-[80px]">Week</TableHead>
                            <TableHead className="min-w-[120px]">Temperature</TableHead>
                            <TableHead className="min-w-[100px]">Lighting</TableHead>
                            <TableHead className="min-w-[120px]">Feed Amount</TableHead>
                            <TableHead className="min-w-[140px]">Feed Type & Protein</TableHead>
                            <TableHead className="min-w-[120px]">Expected Weight</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow className="bg-red-50/50 dark:bg-red-950/20">
                            <TableCell className="font-medium">
                              <Badge variant="destructive" className="text-xs">Week 1</Badge>
                              <div className="text-xs text-muted-foreground mt-1">0-7 days</div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Thermometer className="h-4 w-4 mr-1 text-red-500" />
                                <span className="font-medium">35-32°C</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Sun className="h-4 w-4 mr-1 text-yellow-500" />
                                <span>24 hours</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Utensils className="h-4 w-4 mr-1 text-green-500" />
                                <span className="font-medium">12g/day</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>Chick and Duck Mash</div>
                              <Badge variant="secondary" className="text-xs mt-1">High protein starter</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <span className="font-medium">40-60g</span>
                              </div>
                              <div className="text-xs text-muted-foreground">Critical period</div>
                            </TableCell>
                          </TableRow>
                          <TableRow className="bg-orange-50/50 dark:bg-orange-950/20">
                            <TableCell className="font-medium">
                              <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">Week 2</Badge>
                              <div className="text-xs text-muted-foreground mt-1">8-14 days</div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Thermometer className="h-4 w-4 mr-1 text-orange-500" />
                                <span className="font-medium">32-29°C</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Sun className="h-4 w-4 mr-1 text-yellow-500" />
                                <span>20 hours</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Utensils className="h-4 w-4 mr-1 text-green-500" />
                                <span className="font-medium">18g/day</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>Chick and Duck Mash</div>
                              <Badge variant="secondary" className="text-xs mt-1">High protein starter</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <span className="font-medium">85-120g</span>
                              </div>
                              <div className="text-xs text-muted-foreground">Rapid growth</div>
                            </TableCell>
                          </TableRow>
                          <TableRow className="bg-yellow-50/50 dark:bg-yellow-950/20">
                            <TableCell className="font-medium">
                              <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Week 3</Badge>
                              <div className="text-xs text-muted-foreground mt-1">15-21 days</div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Thermometer className="h-4 w-4 mr-1 text-yellow-600" />
                                <span className="font-medium">29-26°C</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Sun className="h-4 w-4 mr-1 text-yellow-500" />
                                <span>16 hours</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Utensils className="h-4 w-4 mr-1 text-green-500" />
                                <span className="font-medium">25g/day</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>Chick and Duck Mash</div>
                              <Badge variant="secondary" className="text-xs mt-1">High protein starter</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <span className="font-medium">150-200g</span>
                              </div>
                              <div className="text-xs text-muted-foreground">Feed transition</div>
                            </TableCell>
                          </TableRow>
                          <TableRow className="bg-green-50/50 dark:bg-green-950/20">
                            <TableCell className="font-medium">
                              <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Week 4</Badge>
                              <div className="text-xs text-muted-foreground mt-1">22-28 days</div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Thermometer className="h-4 w-4 mr-1 text-green-600" />
                                <span className="font-medium">26-23°C</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Sun className="h-4 w-4 mr-1 text-yellow-500" />
                                <span>14 hours</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Utensils className="h-4 w-4 mr-1 text-green-500" />
                                <span className="font-medium">31g/day</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>Chick and Duck Mash</div>
                              <Badge variant="secondary" className="text-xs mt-1">High protein starter</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <span className="font-medium">220-300g</span>
                              </div>
                              <div className="text-xs text-muted-foreground">Feather development</div>
                            </TableCell>
                          </TableRow>
                          <TableRow className="bg-green-50/50 dark:bg-green-950/20">
                            <TableCell className="font-medium">
                              <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Week 5</Badge>
                              <div className="text-xs text-muted-foreground mt-1">29-35 days</div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Thermometer className="h-4 w-4 mr-1 text-green-600" />
                                <span className="font-medium">23-21°C</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Sun className="h-4 w-4 mr-1 text-yellow-500" />
                                <span>14 hours</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Utensils className="h-4 w-4 mr-1 text-green-500" />
                                <span className="font-medium">38g/day</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>Chick and Duck Mash</div>
                              <Badge variant="secondary" className="text-xs mt-1">High protein starter</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <span className="font-medium">380-400g</span>
                              </div>
                              <div className="text-xs text-muted-foreground">Steady growth</div>
                            </TableCell>
                          </TableRow>
                          <TableRow className="bg-blue-50/50 dark:bg-blue-950/20">
                            <TableCell className="font-medium">
                              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Week 6</Badge>
                              <div className="text-xs text-muted-foreground mt-1">36-42 days</div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Thermometer className="h-4 w-4 mr-1 text-blue-600" />
                                <span className="font-medium">21°C</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Sun className="h-4 w-4 mr-1 text-yellow-500" />
                                <span>14 hours</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Utensils className="h-4 w-4 mr-1 text-green-500" />
                                <span className="font-medium">41g/day</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>Chick and Duck Mash</div>
                              <Badge variant="secondary" className="text-xs mt-1">High protein starter</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <span className="font-medium">470-500g</span>
                              </div>
                              <div className="text-xs text-muted-foreground">Grower preparation</div>
                            </TableCell>
                          </TableRow>
                          <TableRow className="bg-blue-50/50 dark:bg-blue-950/20">
                            <TableCell className="font-medium">
                              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Week 8</Badge>
                              <div className="text-xs text-muted-foreground mt-1">50-56 days</div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Thermometer className="h-4 w-4 mr-1 text-blue-600" />
                                <span className="font-medium">21°C</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Sun className="h-4 w-4 mr-1 text-yellow-500" />
                                <span>14 hours</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Utensils className="h-4 w-4 mr-1 text-green-500" />
                                <span className="font-medium">49g/day</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>Gradual change to Growers Mash</div>
                              <Badge variant="secondary" className="text-xs mt-1">Feed transition</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <span className="font-medium">650g</span>
                              </div>
                              <div className="text-xs text-muted-foreground">Begin grower feed transition</div>
                            </TableCell>
                          </TableRow>
                          <TableRow className="bg-purple-50/50 dark:bg-purple-950/20">
                            <TableCell className="font-medium">
                              <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">Week 9-12</Badge>
                              <div className="text-xs text-muted-foreground mt-1">57-84 days</div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Thermometer className="h-4 w-4 mr-1 text-purple-600" />
                                <span className="font-medium">21°C</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Sun className="h-4 w-4 mr-1 text-yellow-500" />
                                <span>14 hours</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Utensils className="h-4 w-4 mr-1 text-green-500" />
                                <span className="font-medium">52-75g/day</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>Growers Mash</div>
                              <Badge variant="secondary" className="text-xs mt-1">Growth feed</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <span className="font-medium">740-1050g</span>
                              </div>
                              <div className="text-xs text-muted-foreground">Grower phase</div>
                            </TableCell>
                          </TableRow>
                          <TableRow className="bg-indigo-50/50 dark:bg-indigo-950/20">
                            <TableCell className="font-medium">
                              <Badge variant="secondary" className="text-xs bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">Week 13-16</Badge>
                              <div className="text-xs text-muted-foreground mt-1">85-112 days</div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Thermometer className="h-4 w-4 mr-1 text-indigo-600" />
                                <span className="font-medium">21°C</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Sun className="h-4 w-4 mr-1 text-yellow-500" />
                                <span>14 hours</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Utensils className="h-4 w-4 mr-1 text-green-500" />
                                <span className="font-medium">80-100g/day</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>Growers to Layers transition</div>
                              <Badge variant="secondary" className="text-xs mt-1">Pre-layer feed</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <span className="font-medium">1100-1410g</span>
                              </div>
                              <div className="text-xs text-muted-foreground">Pre-layer development</div>
                            </TableCell>
                          </TableRow>
                          <TableRow className="bg-pink-50/50 dark:bg-pink-950/20">
                            <TableCell className="font-medium">
                              <Badge variant="secondary" className="text-xs bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200">Week 17-20</Badge>
                              <div className="text-xs text-muted-foreground mt-1">113-140 days</div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Thermometer className="h-4 w-4 mr-1 text-pink-600" />
                                <span className="font-medium">21°C</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Sun className="h-4 w-4 mr-1 text-yellow-500" />
                                <span>14 hours</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Utensils className="h-4 w-4 mr-1 text-green-500" />
                                <span className="font-medium">107-120g/day</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>Layers Mash</div>
                              <Badge variant="secondary" className="text-xs mt-1">Layer feed</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <span className="font-medium">1440-1750g</span>
                              </div>
                              <div className="text-xs text-muted-foreground">Ready for egg production</div>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Detailed Guidelines Accordion */}
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="temperature">
                      <AccordionTrigger className="text-left" data-testid="accordion-temperature">
                        <div className="flex items-center">
                          <Thermometer className="h-5 w-5 mr-2 text-red-500" />
                          <span>Temperature Management Guide</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4">
                          <p className="text-sm text-muted-foreground">
                            Proper temperature control is critical for chick survival and development. Temperature should be reduced gradually as chicks develop their own thermoregulation.
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-3">
                              <h4 className="font-medium">Temperature Zones</h4>
                              <ul className="text-sm space-y-2">
                                <li>• <strong>Critical Zone (Week 1):</strong> 35-32°C - Chicks cannot regulate body temperature</li>
                                <li>• <strong>Growth Zone (Week 2-3):</strong> 32-26°C - Rapid development period</li>
                                <li>• <strong>Comfort Zone (Week 4+):</strong> 26-21°C - Approaching adult thermoregulation</li>
                              </ul>
                            </div>
                            <div className="space-y-3">
                              <h4 className="font-medium">Temperature Tips</h4>
                              <ul className="text-sm space-y-2">
                                <li>• Monitor chick behavior - huddling indicates cold, spreading indicates heat</li>
                                <li>• Use multiple thermometers at chick level, not air temperature</li>
                                <li>• Reduce temperature by 2-3°C per week after week 1</li>
                                <li>• Provide temperature gradient areas in the brooding space</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="lighting">
                      <AccordionTrigger className="text-left" data-testid="accordion-lighting">
                        <div className="flex items-center">
                          <Sun className="h-5 w-5 mr-2 text-yellow-500" />
                          <span>Lighting Schedule Guide</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4">
                          <p className="text-sm text-muted-foreground">
                            Lighting programs affect feed consumption, growth rate, and natural behavior patterns. Gradual reduction helps establish normal day/night cycles.
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-3">
                              <h4 className="font-medium">Lighting Phases</h4>
                              <ul className="text-sm space-y-2">
                                <li>• <strong>24 Hours (Week 1):</strong> Continuous lighting ensures feed/water access</li>
                                <li>• <strong>20 Hours (Week 2):</strong> Introduce 4 hours of darkness</li>
                                <li>• <strong>16 Hours (Week 3):</strong> Establish day/night rhythm</li>
                                <li>• <strong>14 Hours (Week 4+):</strong> Natural lighting pattern</li>
                              </ul>
                            </div>
                            <div className="space-y-3">
                              <h4 className="font-medium">Lighting Best Practices</h4>
                              <ul className="text-sm space-y-2">
                                <li>• Use 20-40 lux intensity for brooding</li>
                                <li>• Avoid sudden lighting changes - use dimmer systems</li>
                                <li>• Ensure even light distribution throughout brooding area</li>
                                <li>• Provide backup lighting systems for power outages</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="feeding">
                      <AccordionTrigger className="text-left" data-testid="accordion-feeding">
                        <div className="flex items-center">
                          <Utensils className="h-5 w-5 mr-2 text-green-500" />
                          <span>Feed & Nutrition Guide</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4">
                          <p className="text-sm text-muted-foreground">
                            Proper nutrition is essential for healthy growth and development. Feed requirements change as chicks grow and develop.
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-3">
                              <h4 className="font-medium">Feed Types & Stages</h4>
                              <ul className="text-sm space-y-2">
                                <li>• <strong>Chick and Duck Mash:</strong> Week 1-7 - Complete starter nutrition (12-45g/day)</li>
                                <li>• <strong>Gradual Transition:</strong> Week 8 - Change to Growers Mash (49g/day)</li>
                                <li>• <strong>Growers Mash:</strong> Week 9-15 - Growth and development (52-92g/day)</li>
                                <li>• <strong>Layer Feed Transition:</strong> Week 16 - Change to Layers Mash (100g/day)</li>
                                <li>• <strong>Layers Mash:</strong> Week 17-20+ - Pre-laying and production (107-120g/day)</li>
                              </ul>
                            </div>
                            <div className="space-y-3">
                              <h4 className="font-medium">Feeding Guidelines</h4>
                              <ul className="text-sm space-y-2">
                                <li>• Provide fresh, clean water at all times (ratio 2:1 water to feed)</li>
                                <li>• Use appropriate feeder height - adjust as chicks grow</li>
                                <li>• Monitor feed consumption daily - sudden changes indicate health issues</li>
                                <li>• Transition feeds gradually over 3-5 days to avoid digestive upset</li>
                                <li>• Store feed in cool, dry conditions to prevent spoilage</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="weight">
                      <AccordionTrigger className="text-left" data-testid="accordion-weight">
                        <div className="flex items-center">
                          <Scale className="h-5 w-5 mr-2 text-blue-500" />
                          <span>Weight Monitoring Guide</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4">
                          <p className="text-sm text-muted-foreground">
                            Regular weight monitoring helps ensure proper growth and early detection of health issues. Sample weights weekly from different areas of the brooding facility.
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-3">
                              <h4 className="font-medium">Weight Targets by Phase</h4>
                              <ul className="text-sm space-y-2">
                                <li>• <strong>Week 1-2:</strong> 40-120g (Critical establishment phase)</li>
                                <li>• <strong>Week 3-5:</strong> 150-400g (Rapid growth phase)</li>
                                <li>• <strong>Week 6-8:</strong> 470-650g (Transition to grower)</li>
                                <li>• <strong>Week 9-12:</strong> 740-1050g (Active growth period)</li>
                                <li>• <strong>Week 13-16:</strong> 1100-1410g (Pre-layer development)</li>
                                <li>• <strong>Week 17-20:</strong> 1440-1750g (Layer preparation)</li>
                              </ul>
                            </div>
                            <div className="space-y-3">
                              <h4 className="font-medium">Monitoring Best Practices</h4>
                              <ul className="text-sm space-y-2">
                                <li>• Weigh 10-15 chicks from different areas weekly</li>
                                <li>• Record weights at the same time of day consistently</li>
                                <li>• Track weight gain trends, not just absolute weights</li>
                                <li>• Investigate if &gt;20% of chicks fall below target weight</li>
                                <li>• Adjust feeding program based on growth performance</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Deactivated Flocks Tab - Admin Only */}
            {user?.role === 'admin' && (
              <TabsContent value="deactivated">
                <Card data-testid="card-deactivated-flocks">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <AlertCircle className="h-5 w-5 text-muted-foreground" />
                      <span>Deactivated Flocks</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {deactivatedFlocks.filter((flock: any) => flock.status === 'deactivated').length === 0 ? (
                      <div className="text-center py-8">
                        <div className="flex flex-col items-center">
                          <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">No deactivated flocks found</p>
                          <p className="text-sm text-muted-foreground mt-2">Deactivated flocks will appear here for recovery</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                          <div className="flex items-start space-x-3">
                            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                            <div>
                              <h3 className="font-medium text-amber-800 dark:text-amber-200">Recovery Zone</h3>
                              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                                These flocks have been deactivated and are hidden from normal operations. 
                                You can reactivate them to restore full functionality.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {deactivatedFlocks.filter((flock: any) => flock.status === 'deactivated').map((flock: any) => (
                            <Card key={flock.id} data-testid={`card-deactivated-flock-${flock.id}`} className="border-dashed border-muted-foreground/20">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <h3 className="font-semibold text-muted-foreground">{flock.name}</h3>
                                  <Badge variant="outline" className="text-muted-foreground border-muted-foreground/50">
                                    Deactivated
                                  </Badge>
                                </div>
                                <div className="space-y-2 text-sm text-muted-foreground">
                                  <div className="flex justify-between">
                                    <span>Breed:</span>
                                    <span>{flock.breed}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Total Birds:</span>
                                    <span>{flock.currentCount.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Hatch Date:</span>
                                    <span>{new Date(flock.hatchDate).toLocaleDateString()}</span>
                                  </div>
                                </div>

                                <div className="flex gap-2 mt-4">
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="flex-1" 
                                    onClick={() => handleViewDetails(flock)}
                                    data-testid={`button-view-deactivated-flock-${flock.id}`}
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </Button>
                                  
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button 
                                        size="sm" 
                                        className="flex-1 bg-green-600 hover:bg-green-700"
                                        disabled={reactivateFlockMutation.isPending}
                                        data-testid={`button-reactivate-flock-${flock.id}`}
                                      >
                                        <Scale className="h-4 w-4 mr-2" />
                                        {reactivateFlockMutation.isPending ? "Reactivating..." : "Reactivate"}
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <div className="flex items-center space-x-2">
                                          <Scale className="h-6 w-6 text-green-600" />
                                          <AlertDialogTitle className="text-green-600">
                                            ✅ Reactivate Flock
                                          </AlertDialogTitle>
                                        </div>
                                        <AlertDialogDescription className="space-y-3 pt-2">
                                          <p>
                                            You are about to <strong>reactivate</strong> the flock <strong>"{flock.name}"</strong>.
                                          </p>
                                          <div className="space-y-2 text-sm">
                                            <p className="flex items-start space-x-2">
                                              <span className="text-green-600 font-bold">•</span>
                                              <span>This flock will be <strong>restored</strong> to active status</span>
                                            </p>
                                            <p className="flex items-start space-x-2">
                                              <span className="text-green-600 font-bold">•</span>
                                              <span>It will <strong>reappear</strong> in the main brooding flocks list</span>
                                            </p>
                                            <p className="flex items-start space-x-2">
                                              <span className="text-green-600 font-bold">•</span>
                                              <span>Farm staff will <strong>regain access</strong> to all flock data</span>
                                            </p>
                                            <p className="flex items-start space-x-2">
                                              <span className="text-green-600 font-bold">•</span>
                                              <span>All historical records will remain <strong>intact</strong></span>
                                            </p>
                                          </div>
                                          <p className="text-muted-foreground text-sm mt-4">
                                            This action will restore the flock to full operational status.
                                          </p>
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0">
                                        <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                                        <AlertDialogAction 
                                          onClick={() => handleReactivateFlock(flock.id, flock.name)}
                                          className="bg-green-600 text-white hover:bg-green-700 w-full sm:w-auto"
                                        >
                                          <Scale className="h-4 w-4 mr-2" />
                                          Yes, Reactivate Flock
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </main>

      {/* Flock Details Dialog */}
      <Dialog open={flockDetailsOpen} onOpenChange={setFlockDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Flock Details</DialogTitle>
            <DialogDescription>
              Detailed information about {selectedFlock?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedFlock && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Flock Name</label>
                  <p className="text-lg font-semibold">{selectedFlock.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <p>
                    <Badge variant={selectedFlock.status === 'brooding' ? 'secondary' : 'default'}>
                      {selectedFlock.status.charAt(0).toUpperCase() + selectedFlock.status.slice(1)}
                    </Badge>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Breed</label>
                  <p className="text-lg">{selectedFlock.breed}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Current Age</label>
                  <p className="text-lg">Week {Math.floor((new Date().getTime() - new Date(selectedFlock.hatchDate).getTime()) / (1000 * 60 * 60 * 24 * 7))}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Initial Count</label>
                  <p className="text-lg">{selectedFlock.initialCount.toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Current Count</label>
                  <p className="text-lg">{selectedFlock.currentCount.toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Hatch Date</label>
                  <p className="text-lg">{new Date(selectedFlock.hatchDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Mortality Rate</label>
                  <p className="text-lg">
                    {(((selectedFlock.initialCount - selectedFlock.currentCount) / selectedFlock.initialCount) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
              <div className="pt-4 border-t">
                <Button onClick={() => handleEditFlock(selectedFlock)} className="w-full">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Flock Details
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Flock Edit Dialog */}
      <Dialog open={flockEditOpen} onOpenChange={setFlockEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Flock</DialogTitle>
            <DialogDescription>
              Update the details for {selectedFlock?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedFlock && (
            <FlockForm 
              flock={selectedFlock} 
              onSuccess={() => {
                setFlockEditOpen(false);
                setFlockDetailsOpen(false);
                setSelectedFlock(null);
              }} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
