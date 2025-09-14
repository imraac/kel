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
import { Baby, Thermometer, Sun, Utensils, AlertCircle, Plus, Edit, Eye, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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

  const { data: dailyRecords = [], error: recordsError } = useQuery<any[]>({
    queryKey: ["/api/daily-records"],
    enabled: isAuthenticated,
  });

  // Handle unauthorized errors
  useEffect(() => {
    if ((flocksError && isUnauthorizedError(flocksError)) || (recordsError && isUnauthorizedError(recordsError))) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [flocksError, recordsError, toast]);

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

  // Filter flocks to show only brooding flocks that are not deactivated
  const broodingFlocks = flocks.filter((flock: any) => flock.status === 'brooding' && flock.status !== 'deactivated');
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
                                      <AlertDialogTitle>Deactivate Flock</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to deactivate "{flock.name}"? This will hide the flock from the main list. This action can only be performed by administrators.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => handleDeactivateFlock(flock.id, flock.name)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Deactivate Flock
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
                  <CardTitle>Brooding Schedule Guidelines</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold mb-4">Temperature Schedule</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between p-3 bg-muted/50 rounded">
                          <span>Week 0-1 (0-7 days)</span>
                          <span className="font-medium">35-32°C</span>
                        </div>
                        <div className="flex justify-between p-3 bg-muted/50 rounded">
                          <span>Week 2-3 (8-21 days)</span>
                          <span className="font-medium">32-29°C</span>
                        </div>
                        <div className="flex justify-between p-3 bg-muted/50 rounded">
                          <span>Week 4-5 (22-35 days)</span>
                          <span className="font-medium">29-26°C</span>
                        </div>
                        <div className="flex justify-between p-3 bg-muted/50 rounded">
                          <span>Week 6-8 (36-56 days)</span>
                          <span className="font-medium">26-21°C</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold mb-4">Lighting Schedule</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between p-3 bg-muted/50 rounded">
                          <span>Week 0-1 (0-7 days)</span>
                          <span className="font-medium">24 hours</span>
                        </div>
                        <div className="flex justify-between p-3 bg-muted/50 rounded">
                          <span>Week 2-3 (8-21 days)</span>
                          <span className="font-medium">20 hours</span>
                        </div>
                        <div className="flex justify-between p-3 bg-muted/50 rounded">
                          <span>Week 4-5 (22-35 days)</span>
                          <span className="font-medium">16 hours</span>
                        </div>
                        <div className="flex justify-between p-3 bg-muted/50 rounded">
                          <span>Week 6-8 (36-56 days)</span>
                          <span className="font-medium">14 hours</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-4">Feed Guide by Age</h3>
                      <div className="space-y-3">
                        <div className="p-3 bg-muted/50 rounded">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium">Week 0-1 (0-7 days)</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <div>• 15g per bird/day</div>
                            <div>• Chick Starter (22-24% protein)</div>
                            <div>• Crumbled or mash feed</div>
                          </div>
                        </div>
                        <div className="p-3 bg-muted/50 rounded">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium">Week 2 (8-14 days)</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <div>• 25g per bird/day</div>
                            <div>• Chick Starter (20-22% protein)</div>
                            <div>• Small pellets or crumbles</div>
                          </div>
                        </div>
                        <div className="p-3 bg-muted/50 rounded">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium">Week 3 (15-21 days)</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <div>• 35g per bird/day</div>
                            <div>• Chick Grower (18-20% protein)</div>
                            <div>• Transition to pellets</div>
                          </div>
                        </div>
                        <div className="p-3 bg-muted/50 rounded">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium">Week 4-5 (22-35 days)</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <div>• 45-55g per bird/day</div>
                            <div>• Grower Feed (16-18% protein)</div>
                            <div>• Standard pellets</div>
                          </div>
                        </div>
                        <div className="p-3 bg-muted/50 rounded">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium">Week 6+ (36+ days)</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <div>• 60-70g per bird/day</div>
                            <div>• Developer Feed (15-17% protein)</div>
                            <div>• Prepare for layer transition</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-4">Expected Weight by Age</h3>
                      <div className="space-y-3">
                        <div className="p-3 bg-muted/50 rounded">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Week 0-1</span>
                            <span className="text-sm font-medium">35-45g</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Critical growth period - monitor closely
                          </div>
                        </div>
                        <div className="p-3 bg-muted/50 rounded">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Week 2</span>
                            <span className="text-sm font-medium">65-85g</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Rapid growth phase begins
                          </div>
                        </div>
                        <div className="p-3 bg-muted/50 rounded">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Week 3</span>
                            <span className="text-sm font-medium">120-150g</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Feed transition period
                          </div>
                        </div>
                        <div className="p-3 bg-muted/50 rounded">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Week 4</span>
                            <span className="text-sm font-medium">190-230g</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Feather development peak
                          </div>
                        </div>
                        <div className="p-3 bg-muted/50 rounded">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Week 5</span>
                            <span className="text-sm font-medium">270-320g</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Steady growth continues
                          </div>
                        </div>
                        <div className="p-3 bg-muted/50 rounded">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Week 6</span>
                            <span className="text-sm font-medium">360-420g</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Prepare for grower phase
                          </div>
                        </div>
                        <div className="p-3 bg-muted/50 rounded">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Week 7-8</span>
                            <span className="text-sm font-medium">450-620g</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Ready to transition to grower facility
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Additional Tips Section */}
                  <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h4 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">💡 Pro Tips for Successful Brooding</h4>
                    <ul className="text-sm space-y-1 text-blue-800 dark:text-blue-200">
                      <li>• Monitor feed consumption daily - sudden changes indicate health issues</li>
                      <li>• Weigh a sample of 10-20 birds weekly to track growth rates</li>
                      <li>• Adjust temperature gradually - never drop more than 2-3°C per week</li>
                      <li>• Ensure adequate ventilation while maintaining temperature</li>
                      <li>• Keep feed fresh - replace any wet or moldy feed immediately</li>
                      <li>• Provide adequate feeder and drinker space (2.5cm per bird)</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
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
