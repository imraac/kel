import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useFarmContext } from "@/contexts/FarmContext";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Egg, TrendingUp, Plus, Menu, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import SimpleEggProductionForm from "@/components/forms/simple-egg-production-form";
import SalesForm from "@/components/forms/SalesForm";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function EggProduction() {
  const { toast } = useToast();
  const { isLoading, isAuthenticated } = useAuth();
  const { activeFarmId, hasActiveFarm } = useFarmContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [saleDialogOpen, setSaleDialogOpen] = useState(false);
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
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

  const { data: dailyRecords = [], error: recordsError } = useQuery<any[]>({
    queryKey: ["/api/daily-records", activeFarmId],
    queryFn: async () => {
      const response = await fetch(`/api/daily-records?farmId=${activeFarmId}`);
      if (!response.ok) throw new Error('Failed to fetch daily records');
      return response.json();
    },
    enabled: isAuthenticated && hasActiveFarm && !!activeFarmId,
  });

  const { data: sales = [], error: salesError } = useQuery<any[]>({
    queryKey: ["/api/sales", activeFarmId],
    queryFn: async () => {
      const response = await fetch(`/api/sales?farmId=${activeFarmId}`);
      if (!response.ok) throw new Error('Failed to fetch sales');
      return response.json();
    },
    enabled: isAuthenticated && hasActiveFarm && !!activeFarmId,
  });

  // Handle unauthorized errors
  useEffect(() => {
    if ((recordsError && isUnauthorizedError(recordsError)) || (salesError && isUnauthorizedError(salesError))) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [recordsError, salesError, toast]);


  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading egg production data...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const eggRecords = dailyRecords.filter((record: any) => record.eggsCollected > 0);
  const todayRecords = eggRecords.filter((record: any) => 
    record.recordDate === new Date().toISOString().split('T')[0]
  );
  const weekRecords = eggRecords.filter((record: any) => {
    const recordDate = new Date(record.recordDate);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return recordDate >= weekAgo;
  });

  const todayTotal = todayRecords.reduce((sum: number, record: any) => sum + (record.eggsCollected || 0), 0);
  const weekTotal = weekRecords.reduce((sum: number, record: any) => sum + (record.eggsCollected || 0), 0);
  const weekAverage = weekTotal / 7;
  const todayCrates = todayRecords.reduce((sum: number, record: any) => sum + (record.cratesProduced || 0), 0);

  const recentSales = sales.slice(0, 5);
  const weekSales = sales.filter((sale: any) => {
    const saleDate = new Date(sale.saleDate);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return saleDate >= weekAgo;
  });
  const weekRevenue = weekSales.reduce((sum: number, sale: any) => sum + parseFloat(sale.totalAmount || '0'), 0);

  // Daily production trends (last 30 days) with UTC consistency
  const dailyProductionTrends = useMemo(() => {
    // Helper to get stable date key (yyyy-mm-dd format) using UTC
    const getDateKey = (date: Date): string => {
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Helper to format date for display
    const formatDateDisplay = (dateKey: string): string => {
      const [year, month, day] = dateKey.split('-');
      const date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    };

    // Calculate trailing 30 days in UTC
    const now = new Date();
    const nowUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    
    // Generate last 30 days using UTC
    const dateKeys: string[] = [];
    const startDate = new Date(Date.UTC(nowUTC.getUTCFullYear(), nowUTC.getUTCMonth(), nowUTC.getUTCDate() - 29));
    
    for (let i = 0; i < 30; i++) {
      const dayDate = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate() + i));
      dateKeys.push(getDateKey(dayDate));
    }
    
    // Date range for filtering
    const startOfTrailingPeriod = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()));
    const endOfToday = new Date(Date.UTC(nowUTC.getUTCFullYear(), nowUTC.getUTCMonth(), nowUTC.getUTCDate(), 23, 59, 59, 999));

    // Aggregate actual production by day with explicit date range filtering
    const dailyData: { [key: string]: { eggs: number; crates: number } } = {};
    if (dailyRecords && dailyRecords.length > 0) {
      dailyRecords.forEach((record: any) => {
        // Parse record date - handle both date-only (YYYY-MM-DD) and ISO timestamp formats
        const dateStr = record.recordDate;
        const recordDate = dateStr.includes('T') 
          ? new Date(dateStr) // Already has time component
          : new Date(`${dateStr}T00:00:00Z`); // Add UTC time for date-only strings
        
        // Only include if within trailing 30 days date range
        if (recordDate >= startOfTrailingPeriod && recordDate <= endOfToday) {
          const dateKey = getDateKey(recordDate);
          if (!dailyData[dateKey]) {
            dailyData[dateKey] = { eggs: 0, crates: 0 };
          }
          dailyData[dateKey].eggs += record.eggsCollected || 0;
          dailyData[dateKey].crates += record.cratesProduced || 0;
        }
      });
    }

    // Create final dataset with zero-filled days
    return dateKeys.map(dateKey => ({
      dateKey,
      date: formatDateDisplay(dateKey),
      eggs: dailyData[dateKey]?.eggs || 0,
      crates: dailyData[dateKey]?.crates || 0,
    }));
  }, [dailyRecords]);

  // Check if there's any actual production data to display
  const hasProductionActivity = useMemo(() => {
    return dailyProductionTrends.some(d => d.eggs > 0 || d.crates > 0);
  }, [dailyProductionTrends]);

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
                <h2 className="text-xl font-semibold text-foreground">Egg Production</h2>
                <p className="text-sm text-muted-foreground">Track daily egg collection and sales</p>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Dialog open={recordDialogOpen} onOpenChange={setRecordDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-egg-record">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Egg Record
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add Egg Production Record</DialogTitle>
                    <DialogDescription>
                      Record daily egg collection data including total eggs, broken eggs, and crates produced.
                    </DialogDescription>
                  </DialogHeader>
                  <SimpleEggProductionForm onSuccess={() => setRecordDialogOpen(false)} />
                </DialogContent>
              </Dialog>
              
              <Dialog open={saleDialogOpen} onOpenChange={setSaleDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-record-sale">
                    <Plus className="h-4 w-4 mr-2" />
                    Record Sale
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Record Egg Sale</DialogTitle>
                  <DialogDescription>
                    Record egg sales including customer details and payment information.
                  </DialogDescription>
                </DialogHeader>
                <SalesForm 
                  mode="dialog"
                  customerNameRequired={false}
                  showNotes={false}
                  compact={true}
                  onSuccess={() => setSaleDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-4 md:p-6 space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card data-testid="card-today-eggs">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Today's Eggs</p>
                    <p className="text-2xl font-bold text-foreground">{todayTotal.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{todayCrates} crates</p>
                  </div>
                  <div className="w-12 h-12 bg-chart-3/10 rounded-lg flex items-center justify-center">
                    <Egg className="h-6 w-6 text-chart-3" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-week-average">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Week Average</p>
                    <p className="text-2xl font-bold text-foreground">{Math.round(weekAverage).toLocaleString()}</p>
                    <p className="text-xs text-green-600">↗ Daily average</p>
                  </div>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-week-total">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Week Total</p>
                    <p className="text-2xl font-bold text-foreground">{weekTotal.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Last 7 days</p>
                  </div>
                  <div className="w-12 h-12 bg-chart-2/10 rounded-lg flex items-center justify-center">
                    <Egg className="h-6 w-6 text-chart-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-week-revenue">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Week Revenue</p>
                    <p className="text-2xl font-bold text-foreground">KSh {weekRevenue.toLocaleString()}</p>
                    <p className="text-xs text-green-600">Sales income</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="records" className="space-y-4">
            <TabsList>
              <TabsTrigger value="records">Production Records</TabsTrigger>
              <TabsTrigger value="sales">Sales History</TabsTrigger>
              <TabsTrigger value="analysis">Production Analysis</TabsTrigger>
            </TabsList>

            <TabsContent value="records">
              <Card data-testid="card-production-records">
                <CardHeader>
                  <CardTitle>Recent Production Records</CardTitle>
                </CardHeader>
                <CardContent>
                  {eggRecords.length === 0 ? (
                    <div className="text-center py-8">
                      <Egg className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No egg production records found</p>
                      <p className="text-sm text-muted-foreground mt-2">Start recording daily egg collection</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left p-2 font-medium text-muted-foreground">Date</th>
                            <th className="text-left p-2 font-medium text-muted-foreground">Eggs Collected</th>
                            <th className="text-left p-2 font-medium text-muted-foreground">Crates</th>
                            <th className="text-left p-2 font-medium text-muted-foreground">Broken</th>
                            <th className="text-left p-2 font-medium text-muted-foreground">Quality</th>
                          </tr>
                        </thead>
                        <tbody>
                          {eggRecords.slice(0, 10).map((record: any) => (
                            <tr key={record.id} className="border-b border-border/50" data-testid={`row-record-${record.id}`}>
                              <td className="p-2">{new Date(record.recordDate).toLocaleDateString()}</td>
                              <td className="p-2 font-medium">{record.eggsCollected?.toLocaleString()}</td>
                              <td className="p-2">{record.cratesProduced}</td>
                              <td className="p-2 text-orange-600">{record.brokenEggs || 0}</td>
                              <td className="p-2">
                                <Badge variant={record.brokenEggs > 50 ? "destructive" : record.brokenEggs > 20 ? "secondary" : "default"}>
                                  {record.brokenEggs > 50 ? "Poor" : record.brokenEggs > 20 ? "Fair" : "Good"}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sales">
              <Card data-testid="card-sales-history">
                <CardHeader>
                  <CardTitle>Sales History</CardTitle>
                </CardHeader>
                <CardContent>
                  {recentSales.length === 0 ? (
                    <div className="text-center py-8">
                      <DollarSign className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No sales records found</p>
                      <p className="text-sm text-muted-foreground mt-2">Start recording egg sales</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left p-2 font-medium text-muted-foreground">Date</th>
                            <th className="text-left p-2 font-medium text-muted-foreground">Customer</th>
                            <th className="text-left p-2 font-medium text-muted-foreground">Crates</th>
                            <th className="text-left p-2 font-medium text-muted-foreground">Price/Crate</th>
                            <th className="text-left p-2 font-medium text-muted-foreground">Total</th>
                            <th className="text-left p-2 font-medium text-muted-foreground">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentSales.map((sale: any) => (
                            <tr key={sale.id} className="border-b border-border/50" data-testid={`row-sale-${sale.id}`}>
                              <td className="p-2">{new Date(sale.saleDate).toLocaleDateString()}</td>
                              <td className="p-2">{sale.customerName || "Walk-in"}</td>
                              <td className="p-2">{sale.cratesSold}</td>
                              <td className="p-2">KSh {parseFloat(sale.pricePerCrate).toLocaleString()}</td>
                              <td className="p-2 font-medium">KSh {parseFloat(sale.totalAmount).toLocaleString()}</td>
                              <td className="p-2">
                                <Badge variant={
                                  sale.paymentStatus === "paid" ? "default" : 
                                  sale.paymentStatus === "overdue" ? "destructive" : "secondary"
                                }>
                                  {sale.paymentStatus}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analysis">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card data-testid="card-production-trends">
                  <CardHeader>
                    <CardTitle>Production Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!hasProductionActivity ? (
                      <div className="h-80 bg-muted/20 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-sm text-muted-foreground">No production data available</p>
                          <p className="text-xs text-muted-foreground mt-2">Start recording daily production to see trends</p>
                        </div>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={320}>
                        <LineChart data={dailyProductionTrends}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            dataKey="date" 
                            className="text-xs"
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                          />
                          <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '6px'
                            }}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="eggs" 
                            stroke="hsl(221, 83%, 53%)" 
                            strokeWidth={2.5}
                            name="Eggs Collected"
                            dot={false}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="crates" 
                            stroke="hsl(142, 76%, 36%)" 
                            strokeWidth={2.5}
                            name="Crates Produced"
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                <Card data-testid="card-performance-metrics">
                  <CardHeader>
                    <CardTitle>Performance Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-muted/50 rounded">
                        <span className="text-sm text-muted-foreground">Laying Rate</span>
                        <span className="font-medium">89.4%</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted/50 rounded">
                        <span className="text-sm text-muted-foreground">Eggs per Bird/Day</span>
                        <span className="font-medium">0.89</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted/50 rounded">
                        <span className="text-sm text-muted-foreground">Break Rate</span>
                        <span className="font-medium text-orange-600">0.5%</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted/50 rounded">
                        <span className="text-sm text-muted-foreground">Revenue/Crate</span>
                        <span className="font-medium text-green-600">KSh 550</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
