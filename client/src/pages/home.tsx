import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import MetricCard from "@/components/dashboard/metric-card";
import AlertPanel from "@/components/dashboard/alert-panel";
import QuickActions from "@/components/dashboard/quick-actions";
import ActivityFeed from "@/components/dashboard/activity-feed";
import PerformanceSummary from "@/components/dashboard/performance-summary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Bell, Menu, Plus, ClipboardList } from "lucide-react";
import { useState } from "react";

export default function Home() {
  const { toast } = useToast();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const { data: metrics, error: metricsError } = useQuery({
    queryKey: ["/api/dashboard/metrics"],
    enabled: isAuthenticated,
  });

  const { data: activity, error: activityError } = useQuery({
    queryKey: ["/api/dashboard/activity"],
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
              <div className="relative">
                <button 
                  className="p-2 text-muted-foreground hover:text-foreground relative"
                  data-testid="button-notifications"
                >
                  <Bell className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full"></span>
                </button>
              </div>
              
              {/* Quick Actions */}
              <div className="hidden sm:flex items-center space-x-2">
                <Button variant="secondary" size="sm" data-testid="button-add-eggs">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Eggs
                </Button>
                <Button size="sm" data-testid="button-daily-record">
                  <ClipboardList className="h-4 w-4 mr-1" />
                  Daily Record
                </Button>
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
