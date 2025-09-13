import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import MetricCard from "@/components/dashboard/metric-card";
import AlertPanel from "@/components/dashboard/alert-panel";
import QuickActions from "@/components/dashboard/quick-actions";
import ActivityFeed from "@/components/dashboard/activity-feed";
import PerformanceSummary from "@/components/dashboard/performance-summary";
import ComprehensiveDailyRecordForm from "@/components/forms/comprehensive-daily-record-form";
import NotificationPanel from "@/components/dashboard/notification-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Bell, Menu, Plus, ClipboardList } from "lucide-react";
import { z } from "zod";

// Schema for quick egg entry
const eggEntrySchema = z.object({
  flockId: z.string().min(1, "Flock selection is required"),
  eggsCollected: z.number().min(0, "Eggs collected must be non-negative"),
  brokenEggs: z.number().min(0).default(0),
  recordDate: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
});

type EggEntryData = z.infer<typeof eggEntrySchema>;

export default function Home() {
  const { toast } = useToast();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [eggDialogOpen, setEggDialogOpen] = useState(false);
  const [dailyRecordDialogOpen, setDailyRecordDialogOpen] = useState(false);
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

  const { data: metrics = {}, error: metricsError } = useQuery<any>({
    queryKey: ["/api/dashboard/metrics"],
    enabled: isAuthenticated,
  });

  const { data: activity = [], error: activityError } = useQuery<any[]>({
    queryKey: ["/api/dashboard/activity"],
    enabled: isAuthenticated,
  });

  const { data: flocks = [] } = useQuery<any[]>({
    queryKey: ["/api/flocks"],
    enabled: isAuthenticated,
  });

  // Handle unauthorized errors
  useEffect(() => {
    if (metricsError && isUnauthorizedError(metricsError)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [metricsError, toast]);

  // Egg entry form
  const eggForm = useForm<EggEntryData>({
    resolver: zodResolver(eggEntrySchema),
    defaultValues: {
      flockId: "",
      eggsCollected: 0,
      brokenEggs: 0,
      recordDate: new Date().toISOString().split('T')[0],
      notes: "",
    },
  });

  const createEggRecordMutation = useMutation({
    mutationFn: async (data: EggEntryData) => {
      const recordData = {
        flockId: data.flockId,
        recordDate: data.recordDate,
        eggsCollected: data.eggsCollected,
        brokenEggs: data.brokenEggs,
        cratesProduced: Math.floor(data.eggsCollected / 30),
        mortalityCount: 0,
        mortalityReason: null,
        feedConsumed: null,
        feedType: null,
        temperature: null,
        lightingHours: null,
        averageWeight: null,
        sampleSize: 0,
        notes: data.notes || "",
      };
      await apiRequest("POST", "/api/daily-records", recordData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/activity"] });
      toast({
        title: "Success",
        description: "Egg collection recorded successfully",
      });
      eggForm.reset();
      setEggDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record eggs",
        variant: "destructive",
      });
    },
  });

  const onSubmitEggs = (data: EggEntryData) => {
    createEggRecordMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          data-testid="mobile-overlay"
        />
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Top Navigation Bar */}
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
                <h2 className="text-xl font-semibold text-foreground">Farm Dashboard</h2>
                <p className="text-sm text-muted-foreground">{currentDate}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Alerts/Notifications */}
              <NotificationPanel />
              
              {/* Quick Actions */}
              <div className="hidden sm:flex items-center space-x-2">
                <Dialog open={eggDialogOpen} onOpenChange={setEggDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="secondary" size="sm" data-testid="button-add-eggs">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Eggs
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Quick Egg Entry</DialogTitle>
                      <DialogDescription>
                        Record today's egg collection quickly
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...eggForm}>
                      <form onSubmit={eggForm.handleSubmit(onSubmitEggs)} className="space-y-4">
                        <FormField
                          control={eggForm.control}
                          name="flockId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Flock</FormLabel>
                              <FormControl>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <SelectTrigger data-testid="select-quick-egg-flock">
                                    <SelectValue placeholder="Select flock" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {flocks.map((flock) => (
                                      <SelectItem key={flock.id} value={flock.id}>
                                        {flock.name} ({flock.currentCount} birds)
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={eggForm.control}
                          name="recordDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Date</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} data-testid="input-egg-date" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={eggForm.control}
                          name="eggsCollected"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Eggs Collected</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  {...field} 
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                  data-testid="input-eggs-collected"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={eggForm.control}
                          name="brokenEggs"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Broken Eggs</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  {...field} 
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                  data-testid="input-broken-eggs"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={eggForm.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Notes (Optional)</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Any notes about today's collection" data-testid="input-egg-notes" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button 
                          type="submit" 
                          disabled={createEggRecordMutation.isPending}
                          data-testid="button-submit-eggs"
                          className="w-full"
                        >
                          {createEggRecordMutation.isPending ? "Recording..." : "Record Eggs"}
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
                
                <Dialog open={dailyRecordDialogOpen} onOpenChange={setDailyRecordDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" data-testid="button-daily-record">
                      <ClipboardList className="h-4 w-4 mr-1" />
                      Daily Record
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Complete Daily Record</DialogTitle>
                      <DialogDescription>
                        Record comprehensive daily farm activities including eggs, mortality, feed, and environmental data
                      </DialogDescription>
                    </DialogHeader>
                    <ComprehensiveDailyRecordForm onSuccess={() => setDailyRecordDialogOpen(false)} />
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 p-4 md:p-6 space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Birds"
              value={metrics?.totalBirds || 0}
              subtitle="16 mortality this week"
              icon="dove"
              color="primary"
            />
            <MetricCard
              title="Today's Eggs"
              value={metrics?.todayEggs || 0}
              subtitle={`↗ ${metrics?.layingRate || 0}% laying rate`}
              icon="egg"
              color="chart-3"
            />
            <MetricCard
              title="Feed Stock"
              value={`${(metrics?.totalFeedStock / 1000).toFixed(1)} tons`}
              subtitle="⚠ 5 days remaining"
              icon="wheat"
              color="orange"
            />
            <MetricCard
              title="Monthly Revenue"
              value={`KSh ${metrics?.monthlyRevenue?.toLocaleString() || 0}`}
              subtitle="↗ +12% from last month"
              icon="coins"
              color="green"
            />
          </div>

          {/* Alerts & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <AlertPanel />
            </div>
            <QuickActions />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Egg Production Chart */}
            <Card data-testid="card-egg-production-chart">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Egg Production Trend</CardTitle>
                  <select className="text-sm border border-border rounded-md px-3 py-1 bg-background">
                    <option>Last 7 days</option>
                    <option>Last 30 days</option>
                    <option>Last 3 months</option>
                  </select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-80 bg-muted/20 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl text-muted-foreground mb-2">📊</div>
                    <p className="text-sm text-muted-foreground">Egg Production Chart</p>
                    <p className="text-xs text-muted-foreground">Daily production: 4,200-4,800 eggs</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Feed Consumption Chart */}
            <Card data-testid="card-feed-consumption-chart">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Feed Consumption</CardTitle>
                  <select className="text-sm border border-border rounded-md px-3 py-1 bg-background">
                    <option>Last 7 days</option>
                    <option>Last 30 days</option>
                  </select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-80 bg-muted/20 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl text-muted-foreground mb-2">📊</div>
                    <p className="text-sm text-muted-foreground">Feed Consumption Chart</p>
                    <p className="text-xs text-muted-foreground">Daily average: 530kg</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity & Performance Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ActivityFeed activity={activity || []} />
            </div>
            <PerformanceSummary />
          </div>
        </div>
      </main>
    </div>
  );
}
