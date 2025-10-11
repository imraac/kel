import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import MetricCard from "@/components/dashboard/metric-card";
import AlertPanel from "@/components/dashboard/alert-panel";
import SimpleQuickActions from "@/components/dashboard/simple-quick-actions";
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
import { Bell, Menu, Plus, ClipboardList, AlertCircle, RefreshCw, Thermometer, Sun, Utensils, Scale } from "lucide-react";
import { z } from "zod";
import SimpleQuickEggForm from "@/components/forms/simple-quick-egg-form";

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

  const { data: metrics = {}, error: metricsError, isLoading: metricsLoading } = useQuery<any>({
    queryKey: ["/api/dashboard/metrics"],
    enabled: isAuthenticated,
  });

  const { data: activity = [], error: activityError, isLoading: activityLoading } = useQuery<any[]>({
    queryKey: ["/api/dashboard/activity"],
    enabled: isAuthenticated,
  });

  const { data: flocks = [] } = useQuery<any[]>({
    queryKey: ["/api/flocks"],
    enabled: isAuthenticated,
  });

  const { data: dailyRecords = [] } = useQuery<any[]>({
    queryKey: ["/api/daily-records"],
    enabled: isAuthenticated,
  });

  // Calculate weekly mortality (last 7 days)
  const calculateWeeklyMortality = () => {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const weeklyMortality = dailyRecords
      .filter(record => {
        const recordDate = new Date(record.recordDate);
        return recordDate >= sevenDaysAgo && recordDate <= today;
      })
      .reduce((sum, record) => sum + (record.mortalityCount || 0), 0);
    
    return weeklyMortality;
  };

  const weeklyMortality = calculateWeeklyMortality();

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

  // Calculate week number (ISO week)
  const getWeekNumber = (date: Date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  const weekNumber = getWeekNumber(new Date());

  // Get primary flock (oldest active flock) for age calculation - non-mutating
  const primaryFlock = flocks.length > 0 
    ? [...flocks].sort((a, b) => new Date(a.hatchDate).getTime() - new Date(b.hatchDate).getTime())[0]
    : null;

  const getFlockAge = (hatchDate: string) => {
    const today = new Date();
    const hatch = new Date(hatchDate);
    const diffTime = today.getTime() - hatch.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const flockAge = primaryFlock ? getFlockAge(primaryFlock.hatchDate) : null;
  const flockWeekAge = flockAge !== null ? Math.max(1, Math.floor((flockAge - 1) / 7) + 1) : null;

  // Get weekly targets based on flock age (matches brooding schedule)
  const getWeeklyTargets = (age: number | null) => {
    if (age === null || age === undefined) return null;
    
    // Calculate the current week number with boundary-safe formula
    const currentWeek = Math.max(1, Math.floor((age - 1) / 7) + 1);
    
    // Week-indexed lookup map for specific targets
    const WEEKLY_TARGETS: Record<number, {
      temperature: string;
      lighting: string;
      feedType: string;
      feedAmount: string;
      expectedWeight: string;
      weekLabel: string;
    }> = {
      1: {
        temperature: "35-32°C",
        lighting: "24 hours",
        feedType: "Chick and Duck Mash",
        feedAmount: "12g per bird",
        expectedWeight: "40-60g",
        weekLabel: "Week 1: Critical Care"
      },
      2: {
        temperature: "32-29°C",
        lighting: "20 hours",
        feedType: "Chick and Duck Mash",
        feedAmount: "18g per bird",
        expectedWeight: "85-120g",
        weekLabel: "Week 2: Rapid Growth"
      },
      3: {
        temperature: "29-26°C",
        lighting: "16 hours",
        feedType: "Chick and Duck Mash",
        feedAmount: "25g per bird",
        expectedWeight: "150-200g",
        weekLabel: "Week 3: Development"
      },
      4: {
        temperature: "26-23°C",
        lighting: "14 hours",
        feedType: "Chick and Duck Mash",
        feedAmount: "31g per bird",
        expectedWeight: "220-300g",
        weekLabel: "Week 4: Feather Development"
      },
      5: {
        temperature: "23-21°C",
        lighting: "14 hours",
        feedType: "Chick and Duck Mash",
        feedAmount: "38g per bird",
        expectedWeight: "380-400g",
        weekLabel: "Week 5: Steady Growth"
      },
      6: {
        temperature: "21°C",
        lighting: "14 hours",
        feedType: "Chick and Duck Mash",
        feedAmount: "41g per bird",
        expectedWeight: "470-500g",
        weekLabel: "Week 6: Grower Prep"
      },
      7: {
        temperature: "21°C",
        lighting: "14 hours",
        feedType: "Chick and Duck Mash",
        feedAmount: "45g per bird",
        expectedWeight: "560-600g",
        weekLabel: "Week 7: Transition Prep"
      },
      8: {
        temperature: "21°C",
        lighting: "14 hours",
        feedType: "Gradual change to Growers Mash",
        feedAmount: "49g per bird",
        expectedWeight: "650g",
        weekLabel: "Week 8: Feed Transition"
      },
      9: {
        temperature: "21°C",
        lighting: "14 hours",
        feedType: "Growers Mash",
        feedAmount: "52g per bird",
        expectedWeight: "740g",
        weekLabel: "Week 9: Growth Phase"
      },
      10: {
        temperature: "21°C",
        lighting: "14 hours",
        feedType: "Growers Mash",
        feedAmount: "58g per bird",
        expectedWeight: "820g",
        weekLabel: "Week 10: Growth Phase"
      },
      11: {
        temperature: "21°C",
        lighting: "14 hours",
        feedType: "Growers Mash",
        feedAmount: "65g per bird",
        expectedWeight: "920g",
        weekLabel: "Week 11: Growth Phase"
      },
      12: {
        temperature: "21°C",
        lighting: "14 hours",
        feedType: "Growers Mash",
        feedAmount: "75g per bird",
        expectedWeight: "1050g",
        weekLabel: "Week 12: Growth Phase"
      },
      13: {
        temperature: "21°C",
        lighting: "14 hours",
        feedType: "Growers Mash",
        feedAmount: "80g per bird",
        expectedWeight: "1100g",
        weekLabel: "Week 13: Pre-Layer Development"
      },
      14: {
        temperature: "21°C",
        lighting: "14 hours",
        feedType: "Growers Mash",
        feedAmount: "86g per bird",
        expectedWeight: "1210g",
        weekLabel: "Week 14: Pre-Layer Development"
      },
      15: {
        temperature: "21°C",
        lighting: "14 hours",
        feedType: "Growers Mash",
        feedAmount: "92g per bird",
        expectedWeight: "1320g",
        weekLabel: "Week 15: Pre-Layer Development"
      }
    };
    
    // For week 16+, return a dynamic label based on the actual week
    if (currentWeek >= 16) {
      return {
        temperature: "21°C",
        lighting: "14 hours",
        feedType: "Layers Mash",
        feedAmount: "100-120g per bird",
        expectedWeight: "1355-1750g",
        weekLabel: `Week ${currentWeek}: Layer Phase`
      };
    }
    
    // Return the specific week's targets
    return WEEKLY_TARGETS[currentWeek] || null;
  };

  const weeklyTargets = getWeeklyTargets(flockAge);

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
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-xs text-muted-foreground" data-testid="text-week-number">
                    Week {weekNumber} of {new Date().getFullYear()}
                  </p>
                  {flockAge !== null && (
                    <>
                      <span className="text-xs text-muted-foreground">•</span>
                      <p className="text-xs text-muted-foreground" data-testid="text-flock-age">
                        Flock Age: {flockAge} days (Week {flockWeekAge})
                      </p>
                    </>
                  )}
                </div>
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
                    <SimpleQuickEggForm onSuccess={() => setEggDialogOpen(false)} />
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
          {metricsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} data-testid={`card-metric-loading-${i}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between animate-pulse">
                      <div className="space-y-2">
                        <div className="h-4 w-20 bg-muted rounded"></div>
                        <div className="h-6 w-16 bg-muted rounded"></div>
                        <div className="h-3 w-24 bg-muted rounded"></div>
                      </div>
                      <div className="w-12 h-12 bg-muted rounded-lg"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : metricsError && !isUnauthorizedError(metricsError) ? (
            <Card data-testid="card-metrics-error">
              <CardContent className="p-6">
                <div className="flex items-center justify-center space-x-3 text-center">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Failed to load dashboard metrics</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {metricsError.message || "Unable to fetch farm data. Please try again."}
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] })}
                      data-testid="button-retry-metrics"
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Retry
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title="Total Birds"
                value={metrics?.totalBirds || 0}
                subtitle={`${weeklyMortality} mortality this week`}
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
                value={`${((metrics?.totalFeedStock || 0) / 1000).toFixed(1)} tons`}
                subtitle={
                  metrics?.feedDaysRemaining !== undefined
                    ? metrics.feedDaysRemaining < 7
                      ? `⚠ ${metrics.feedDaysRemaining} ${metrics.feedDaysRemaining === 1 ? 'day' : 'days'} remaining`
                      : `${metrics.feedDaysRemaining} ${metrics.feedDaysRemaining === 1 ? 'day' : 'days'} remaining`
                    : "No data"
                }
                icon="wheat"
                color="orange"
              />
              <MetricCard
                title="Monthly Revenue"
                value={`KSh ${metrics?.monthlyRevenue?.toLocaleString() || 0}`}
                subtitle={
                  metrics?.revenueChange 
                    ? `${parseFloat(metrics.revenueChange) >= 0 ? '↗' : '↘'} ${parseFloat(metrics.revenueChange) >= 0 ? '+' : ''}${metrics.revenueChange}% from last month`
                    : "No previous data"
                }
                icon="coins"
                color="green"
              />
            </div>
          )}

          {/* Weekly Targets & Requirements */}
          {weeklyTargets && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">This Week's Targets</h3>
                <p className="text-sm text-muted-foreground">{weeklyTargets.weekLabel}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card data-testid="card-target-temperature">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                        <Thermometer className="h-5 w-5 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Temperature</p>
                        <p className="text-sm font-semibold text-foreground mt-1">{weeklyTargets.temperature}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="card-target-lighting">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                        <Sun className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Lighting</p>
                        <p className="text-sm font-semibold text-foreground mt-1">{weeklyTargets.lighting}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="card-target-feed">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                        <Utensils className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Feed Amount</p>
                        <p className="text-sm font-semibold text-foreground mt-1">{weeklyTargets.feedAmount}</p>
                        <p className="text-xs text-muted-foreground mt-1">{weeklyTargets.feedType}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="card-target-weight">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                        <Scale className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Expected Weight</p>
                        <p className="text-sm font-semibold text-foreground mt-1">{weeklyTargets.expectedWeight}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Alerts & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <AlertPanel />
            </div>
            <SimpleQuickActions />
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
              {activityLoading ? (
                <Card data-testid="card-activity-loading">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Recent Activity</CardTitle>
                      <div className="h-6 w-16 bg-muted rounded animate-pulse"></div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-start space-x-3 animate-pulse">
                          <div className="w-8 h-8 bg-muted rounded-full"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 w-3/4 bg-muted rounded"></div>
                            <div className="h-3 w-20 bg-muted rounded"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : activityError && !isUnauthorizedError(activityError) ? (
                <Card data-testid="card-activity-error">
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-center space-x-3 text-center py-8">
                      <AlertCircle className="h-8 w-8 text-destructive" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Failed to load recent activity</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {activityError.message || "Unable to fetch activity data. Please try again."}
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-2"
                          onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/dashboard/activity"] })}
                          data-testid="button-retry-activity"
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Retry
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <ActivityFeed activity={activity || []} />
              )}
            </div>
            <PerformanceSummary />
          </div>
        </div>
      </main>
    </div>
  );
}
