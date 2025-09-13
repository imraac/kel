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
import { Baby, Thermometer, Sun, Utensils, AlertCircle, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Menu } from "lucide-react";
import BroodingRecordForm from "@/components/forms/brooding-record-form";
import FlockForm from "@/components/forms/flock-form";

export default function ChickBrooding() {
  const { toast } = useToast();
  const { isLoading, isAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const [flockDialogOpen, setFlockDialogOpen] = useState(false);
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
                <BroodingRecordForm onSuccess={() => setRecordDialogOpen(false)} />
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
                        <FlockForm onSuccess={() => setFlockDialogOpen(false)} />
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
                            <Button size="sm" className="w-full mt-4" data-testid={`button-view-flock-${flock.id}`}>
                              View Details
                            </Button>
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
                        <BroodingRecordForm onSuccess={() => setRecordDialogOpen(false)} />
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
                          <span>Week 0-1</span>
                          <span className="font-medium">35-32°C</span>
                        </div>
                        <div className="flex justify-between p-3 bg-muted/50 rounded">
                          <span>Week 2-3</span>
                          <span className="font-medium">32-29°C</span>
                        </div>
                        <div className="flex justify-between p-3 bg-muted/50 rounded">
                          <span>Week 4-5</span>
                          <span className="font-medium">29-26°C</span>
                        </div>
                        <div className="flex justify-between p-3 bg-muted/50 rounded">
                          <span>Week 6-8</span>
                          <span className="font-medium">26-21°C</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold mb-4">Lighting Schedule</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between p-3 bg-muted/50 rounded">
                          <span>Week 0-1</span>
                          <span className="font-medium">24 hours</span>
                        </div>
                        <div className="flex justify-between p-3 bg-muted/50 rounded">
                          <span>Week 2-3</span>
                          <span className="font-medium">20 hours</span>
                        </div>
                        <div className="flex justify-between p-3 bg-muted/50 rounded">
                          <span>Week 4-5</span>
                          <span className="font-medium">16 hours</span>
                        </div>
                        <div className="flex justify-between p-3 bg-muted/50 rounded">
                          <span>Week 6-8</span>
                          <span className="font-medium">14 hours</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
