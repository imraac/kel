import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useFarmContext } from "@/contexts/FarmContext";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import { BarChart3, TrendingUp, Download, Calendar, Menu, FileText, PieChart, Calculator, DollarSign, AlertCircle, ArrowRight, ShoppingCart, DollarSign as CostsIcon, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "wouter";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

// Break-even metrics type
interface BreakEvenMetrics {
  hasData: boolean;
  autoCalculated?: boolean;
  message?: string;
  suggestedActions?: Array<{ label: string; route: string }>;
  dataSource?: {
    monthsAnalyzed: number;
    salesRecords: number;
    expenseRecords: number;
    dateRange: { startDate: string; endDate: string };
  };
  derivedValues?: {
    averagePrice: number;
    averageUnitVariableCost: number;
    averageFixedCostsPerMonth: number;
    averageMonthlyUnits: number;
    calculatedGrowthRate: number;
  };
  contributionMargin?: number;
  contributionMarginRatio?: number;
  breakEvenUnits?: number;
  breakEvenRevenue?: number;
  breakEvenMonth?: number | null;
  breakEvenDate?: string | null;
  monthlyProjections?: Array<{
    month: number;
    units: number;
    revenue: number;
    variableCosts: number;
    fixedCosts: number;
    totalCosts: number;
    profit: number;
    cumulativeProfit: number;
  }>;
}

export default function Reports() {
  const { toast } = useToast();
  const { isLoading, isAuthenticated } = useAuth();
  const { activeFarmId, hasActiveFarm } = useFarmContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("30");
  const [rollingWindow, setRollingWindow] = useState<3 | 6 | 12>(6);

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

  const { data: dailyRecords, error: recordsError } = useQuery({
    queryKey: ["/api/daily-records", activeFarmId],
    queryFn: async () => {
      const response = await fetch(`/api/daily-records?farmId=${activeFarmId}`);
      if (!response.ok) throw new Error('Failed to fetch daily records');
      return response.json();
    },
    enabled: isAuthenticated && hasActiveFarm && !!activeFarmId,
  });

  const { data: sales, error: salesError } = useQuery({
    queryKey: ["/api/sales", activeFarmId],
    queryFn: async () => {
      const response = await fetch(`/api/sales?farmId=${activeFarmId}`);
      if (!response.ok) throw new Error('Failed to fetch sales');
      return response.json();
    },
    enabled: isAuthenticated && hasActiveFarm && !!activeFarmId,
  });

  const { data: expenses, error: expensesError } = useQuery({
    queryKey: ["/api/expenses", activeFarmId],
    queryFn: async () => {
      const response = await fetch(`/api/expenses?farmId=${activeFarmId}`);
      if (!response.ok) throw new Error('Failed to fetch expenses');
      return response.json();
    },
    enabled: isAuthenticated && hasActiveFarm && !!activeFarmId,
  });

  const { data: feedInventory, error: feedError } = useQuery({
    queryKey: ["/api/feed-inventory", activeFarmId],
    queryFn: async () => {
      const response = await fetch(`/api/feed-inventory?farmId=${activeFarmId}`);
      if (!response.ok) throw new Error('Failed to fetch feed inventory');
      return response.json();
    },
    enabled: isAuthenticated && hasActiveFarm && !!activeFarmId,
  });

  // Break-even analysis data
  const { data: breakEvenMetrics, isLoading: breakEvenLoading } = useQuery<BreakEvenMetrics>({
    queryKey: ["/api/breakeven/metrics", rollingWindow, activeFarmId],
    queryFn: async () => {
      const response = await fetch(`/api/breakeven/metrics?months=${rollingWindow}&farmId=${activeFarmId}`);
      if (!response.ok) throw new Error('Failed to fetch break-even metrics');
      return response.json();
    },
    enabled: isAuthenticated && hasActiveFarm && !!activeFarmId,
    refetchOnWindowFocus: true,
  });

  // Handle unauthorized errors
  useEffect(() => {
    const errors = [recordsError, salesError, expensesError, feedError];
    if (errors.some(error => error && isUnauthorizedError(error))) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [recordsError, salesError, expensesError, feedError, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading reports...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Calculate report data
  const periodDays = parseInt(selectedPeriod);
  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - periodDays);

  const periodRecords = (dailyRecords || []).filter((record: any) => 
    new Date(record.recordDate) >= periodStart
  );

  const periodSales = (sales || []).filter((sale: any) => 
    new Date(sale.saleDate) >= periodStart
  );

  const periodExpenses = (expenses || []).filter((expense: any) => 
    new Date(expense.expenseDate) >= periodStart
  );

  // Production metrics
  const totalEggs = periodRecords.reduce((sum: number, record: any) => 
    sum + (record.eggsCollected || 0), 0);
  const totalMortality = periodRecords.reduce((sum: number, record: any) => 
    sum + (record.mortalityCount || 0), 0);
  const totalFeedConsumed = periodRecords.reduce((sum: number, record: any) => 
    sum + parseFloat(record.feedConsumed || '0'), 0);

  // Financial metrics
  const totalRevenue = periodSales.reduce((sum: number, sale: any) => 
    sum + parseFloat(sale.totalAmount || '0'), 0);
  const totalExpenseAmount = periodExpenses.reduce((sum: number, expense: any) => 
    sum + parseFloat(expense.amount || '0'), 0);
  const netProfit = totalRevenue - totalExpenseAmount;

  // Efficiency metrics
  const averageEggsPerDay = periodRecords.length > 0 ? totalEggs / periodRecords.length : 0;
  const feedEfficiency = totalEggs > 0 ? (totalEggs / totalFeedConsumed) * 1000 : 0; // eggs per kg of feed * 1000
  const mortalityRate = periodRecords.length > 0 ? (totalMortality / (periodRecords.length * 5300)) * 100 : 0;

  // Expense breakdown
  const expenseCategories = (expenses || []).reduce((acc: any, expense: any) => {
    const category = expense.category || 'other';
    acc[category] = (acc[category] || 0) + parseFloat(expense.amount || '0');
    return acc;
  }, {});

  const handleExportReport = (reportType: string) => {
    toast({
      title: "Export Started",
      description: `${reportType} report export will begin shortly`,
    });
  };

  // Break-even utility functions
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const downloadBreakEvenCSV = () => {
    if (!breakEvenMetrics?.monthlyProjections) return;

    const headers = [
      "Month", "Units", "Revenue", "Variable Costs", "Fixed Costs", 
      "Total Costs", "Profit", "Cumulative Profit"
    ];
    const rows = breakEvenMetrics.monthlyProjections.map(m => [
      m.month,
      m.units,
      m.revenue,
      m.variableCosts,
      m.fixedCosts,
      m.totalCosts,
      m.profit,
      m.cumulativeProfit,
    ]);

    const summaryRows = [
      [""],
      ["AUTO-CALCULATED METRICS"],
      ["Data Source", `${breakEvenMetrics.dataSource?.monthsAnalyzed || 0} months of historical data`],
      ["Sales Records", breakEvenMetrics.dataSource?.salesRecords || 0],
      ["Expense Records", breakEvenMetrics.dataSource?.expenseRecords || 0],
      [""],
    ];

    if (breakEvenMetrics.derivedValues) {
      summaryRows.push(
        ["DERIVED VALUES"],
        ["Average Price/Crate", `${formatCurrency(breakEvenMetrics.derivedValues.averagePrice)}`],
        ["Avg Variable Cost/Crate", `${formatCurrency(breakEvenMetrics.derivedValues.averageUnitVariableCost)}`],
        ["Avg Fixed Costs/Month", `${formatCurrency(breakEvenMetrics.derivedValues.averageFixedCostsPerMonth)}`],
        ["Avg Monthly Units", breakEvenMetrics.derivedValues.averageMonthlyUnits.toString()],
        ["Calculated Growth Rate", `${(breakEvenMetrics.derivedValues.calculatedGrowthRate ?? 0).toFixed(2)}%`]
      );
    }

    const csvContent = [
      ...summaryRows.map(row => row.join(",")),
      [""],
      headers.join(","),
      ...rows.map(row => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `break-even-analysis-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: "CSV file downloaded successfully",
    });
  };

  const downloadBreakEvenPDF = () => {
    window.print();
    toast({
      title: "Print Dialog",
      description: "Use Print > Save as PDF to export",
    });
  };

  // Prepare daily production chart data (last 30 days)
  const dailyProductionData = (dailyRecords || [])
    .filter((record: any) => new Date(record.recordDate) >= periodStart)
    .sort((a: any, b: any) => new Date(a.recordDate).getTime() - new Date(b.recordDate).getTime())
    .map((record: any) => ({
      date: new Date(record.recordDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      eggs: record.eggsCollected || 0,
      crates: record.cratesProduced || 0,
    }));

  // Prepare monthly trends data (last 12 months)
  const monthlyData: { [key: string]: { eggs: number; revenue: number; expenses: number; count: number } } = {};
  
  // Helper to get stable month key (yyyy-mm format)
  const getMonthKey = (dateString: string): string => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  // Helper to format month for display
  const formatMonthDisplay = (monthKey: string): string => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  };
  
  // Process daily records for monthly aggregation
  (dailyRecords || []).forEach((record: any) => {
    const monthKey = getMonthKey(record.recordDate);
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { eggs: 0, revenue: 0, expenses: 0, count: 0 };
    }
    monthlyData[monthKey].eggs += record.eggsCollected || 0;
    monthlyData[monthKey].count += 1;
  });

  // Process sales for monthly revenue
  (sales || []).forEach((sale: any) => {
    const monthKey = getMonthKey(sale.saleDate);
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { eggs: 0, revenue: 0, expenses: 0, count: 0 };
    }
    monthlyData[monthKey].revenue += parseFloat(sale.totalAmount || '0');
  });

  // Process expenses for monthly costs
  (expenses || []).forEach((expense: any) => {
    const monthKey = getMonthKey(expense.expenseDate);
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { eggs: 0, revenue: 0, expenses: 0, count: 0 };
    }
    monthlyData[monthKey].expenses += parseFloat(expense.amount || '0');
  });

  // Convert to array and sort by date (last 12 months)
  const monthlyTrendsData = Object.entries(monthlyData)
    .map(([monthKey, data]) => ({
      monthKey,
      month: formatMonthDisplay(monthKey),
      eggs: data.eggs,
      revenue: data.revenue,
      expenses: data.expenses,
      profit: data.revenue - data.expenses,
    }))
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
    .slice(-12); // Last 12 months

  // Calculate revenue forecast (next 3 months based on average)
  const avgMonthlyRevenue = monthlyTrendsData.length > 0 
    ? monthlyTrendsData.reduce((sum, m) => sum + m.revenue, 0) / monthlyTrendsData.length 
    : 0;
  const avgMonthlyExpenses = monthlyTrendsData.length > 0
    ? monthlyTrendsData.reduce((sum, m) => sum + m.expenses, 0) / monthlyTrendsData.length
    : 0;
  
  // Guard against division by zero and missing data
  let growthRate = 0.02; // Default 2% growth
  if (monthlyTrendsData.length > 3) {
    const firstRevenue = monthlyTrendsData[0].revenue;
    const lastRevenue = monthlyTrendsData[monthlyTrendsData.length - 1].revenue;
    if (firstRevenue > 0 && lastRevenue > firstRevenue) {
      growthRate = ((lastRevenue - firstRevenue) / firstRevenue) / monthlyTrendsData.length;
    }
  }

  const forecastData = [];
  for (let i = 1; i <= 3; i++) {
    const forecastMonth = new Date();
    forecastMonth.setMonth(forecastMonth.getMonth() + i);
    const year = forecastMonth.getFullYear();
    const month = String(forecastMonth.getMonth() + 1).padStart(2, '0');
    const monthKey = `${year}-${month}`;
    
    const forecastRevenue = avgMonthlyRevenue * (1 + growthRate * i);
    const forecastExpenses = avgMonthlyExpenses * (1 + growthRate * i * 0.7); // Expenses grow slower
    forecastData.push({
      monthKey,
      month: formatMonthDisplay(monthKey),
      eggs: 0, // Not forecasting production
      revenue: forecastRevenue,
      expenses: forecastExpenses,
      profit: forecastRevenue - forecastExpenses,
      isForecast: true,
    });
  }

  // Combine historical and forecast data
  const trendsWithForecast = [
    ...monthlyTrendsData.map(d => ({ ...d, isForecast: false })),
    ...forecastData,
  ];

  // Calculate trend insights
  let productionChange = 0;
  if (monthlyTrendsData.length > 1) {
    const firstEggs = monthlyTrendsData[0].eggs;
    const lastEggs = monthlyTrendsData[monthlyTrendsData.length - 1].eggs;
    // Guard against division by zero - if first month has no eggs, use second month or skip calculation
    if (firstEggs > 0) {
      productionChange = ((lastEggs - firstEggs) / firstEggs) * 100;
    } else if (monthlyTrendsData.length > 2 && monthlyTrendsData[1].eggs > 0) {
      // Use second month as baseline if first has no production
      productionChange = ((lastEggs - monthlyTrendsData[1].eggs) / monthlyTrendsData[1].eggs) * 100;
    }
  }
  
  const avgProfit = monthlyTrendsData.length > 0
    ? monthlyTrendsData.reduce((sum, m) => sum + m.profit, 0) / monthlyTrendsData.length
    : 0;
  const isProfitable = avgProfit > 0;

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
                <h2 className="text-xl font-semibold text-foreground">Reports & Analytics</h2>
                <p className="text-sm text-muted-foreground">Comprehensive farm performance analysis</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-32" data-testid="select-period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 3 months</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="sm" data-testid="button-export">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-4 md:p-6 space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card data-testid="card-total-eggs">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Eggs</p>
                    <p className="text-2xl font-bold text-foreground">{totalEggs.toLocaleString()}</p>
                    <p className="text-xs text-green-600">↗ {averageEggsPerDay.toFixed(0)}/day avg</p>
                  </div>
                  <div className="w-12 h-12 bg-chart-3/10 rounded-lg flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-chart-3" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-total-revenue">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold text-foreground">KSh {totalRevenue.toLocaleString()}</p>
                    <p className="text-xs text-green-600">Sales income</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-total-expenses">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
                    <p className="text-2xl font-bold text-foreground">KSh {totalExpenseAmount.toLocaleString()}</p>
                    <p className="text-xs text-orange-600">Operating costs</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <FileText className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-net-profit">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Net Profit</p>
                    <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      KSh {netProfit.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">Revenue - Expenses</p>
                  </div>
                  <div className={`w-12 h-12 ${netProfit >= 0 ? 'bg-green-100' : 'bg-red-100'} rounded-lg flex items-center justify-center`}>
                    <PieChart className={`h-6 w-6 ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="production" className="space-y-4">
            <TabsList>
              <TabsTrigger value="production">Production Report</TabsTrigger>
              <TabsTrigger value="financial">Financial Report</TabsTrigger>
              <TabsTrigger value="efficiency">Efficiency Analysis</TabsTrigger>
              <TabsTrigger value="trends">Trends & Forecasts</TabsTrigger>
              <TabsTrigger value="breakeven">Break-Even Analysis</TabsTrigger>
            </TabsList>

            <TabsContent value="production">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card data-testid="card-production-summary">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Production Summary</CardTitle>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleExportReport("Production")}
                        data-testid="button-export-production"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-muted/50 rounded">
                        <span className="text-sm text-muted-foreground">Total Eggs Produced</span>
                        <span className="font-medium">{totalEggs.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted/50 rounded">
                        <span className="text-sm text-muted-foreground">Average Daily Production</span>
                        <span className="font-medium">{averageEggsPerDay.toFixed(0)}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted/50 rounded">
                        <span className="text-sm text-muted-foreground">Total Mortality</span>
                        <span className="font-medium text-red-600">{totalMortality}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted/50 rounded">
                        <span className="text-sm text-muted-foreground">Mortality Rate</span>
                        <span className={`font-medium ${mortalityRate > 1 ? 'text-red-600' : 'text-green-600'}`}>
                          {mortalityRate.toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted/50 rounded">
                        <span className="text-sm text-muted-foreground">Feed Consumed</span>
                        <span className="font-medium">{totalFeedConsumed.toLocaleString()} kg</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="card-production-trends">
                  <CardHeader>
                    <CardTitle>Production Trends</CardTitle>
                    <CardDescription>Daily egg production over selected period</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {dailyProductionData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={320}>
                        <LineChart data={dailyProductionData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 12 }}
                            interval="preserveStartEnd"
                          />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="eggs" 
                            stroke="#8884d8" 
                            strokeWidth={2}
                            name="Eggs Collected"
                            dot={false}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="crates" 
                            stroke="#82ca9d" 
                            strokeWidth={2}
                            name="Crates Produced"
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-80 bg-muted/20 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-sm text-muted-foreground">No production data available</p>
                          <p className="text-xs text-muted-foreground mt-2">Add daily records to see trends</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="financial">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card data-testid="card-financial-summary">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Financial Summary</CardTitle>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleExportReport("Financial")}
                        data-testid="button-export-financial"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded">
                        <span className="text-sm text-muted-foreground">Total Revenue</span>
                        <span className="font-medium text-green-600">KSh {totalRevenue.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded">
                        <span className="text-sm text-muted-foreground">Total Expenses</span>
                        <span className="font-medium text-red-600">KSh {totalExpenseAmount.toLocaleString()}</span>
                      </div>
                      <div className={`flex justify-between items-center p-3 ${netProfit >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'} rounded`}>
                        <span className="text-sm text-muted-foreground">Net Profit/Loss</span>
                        <span className={`font-medium ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          KSh {netProfit.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted/50 rounded">
                        <span className="text-sm text-muted-foreground">Profit Margin</span>
                        <span className="font-medium">
                          {totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="card-expense-breakdown">
                  <CardHeader>
                    <CardTitle>Expense Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(expenseCategories).map(([category, amount]) => {
                        const percentage = totalExpenseAmount > 0 ? ((amount as number) / totalExpenseAmount * 100) : 0;
                        return (
                          <div key={category}>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm capitalize">{category}</span>
                              <span className="text-sm font-medium">KSh {(amount as number).toLocaleString()}</span>
                            </div>
                            <Progress value={percentage} className="h-2" />
                            <p className="text-xs text-muted-foreground mt-1">{percentage.toFixed(1)}%</p>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="efficiency">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card data-testid="card-efficiency-metrics">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Efficiency Metrics</CardTitle>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleExportReport("Efficiency")}
                        data-testid="button-export-efficiency"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-muted-foreground">Feed Conversion Efficiency</span>
                          <span className="font-medium">{feedEfficiency.toFixed(1)} eggs/1000kg</span>
                        </div>
                        <Progress value={Math.min((feedEfficiency / 2000) * 100, 100)} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">Target: 2000+ eggs per 1000kg feed</p>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-muted-foreground">Laying Rate</span>
                          <span className="font-medium">89.2%</span>
                        </div>
                        <Progress value={89.2} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">Target: 90%+</p>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-muted-foreground">Mortality Rate</span>
                          <span className="font-medium">{mortalityRate.toFixed(2)}%</span>
                        </div>
                        <Progress value={mortalityRate * 10} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">Target: &lt;0.5%</p>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-muted-foreground">Cost per Egg</span>
                          <span className="font-medium">
                            KSh {totalEggs > 0 ? (totalExpenseAmount / totalEggs).toFixed(2) : '0.00'}
                          </span>
                        </div>
                        <Progress value={75} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">Competitive range</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="card-performance-benchmarks">
                  <CardHeader>
                    <CardTitle>Performance Benchmarks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-green-800 dark:text-green-200">Excellent Performance</span>
                          <Badge variant="default">Above Average</Badge>
                        </div>
                        <ul className="text-sm text-green-700 dark:text-green-300 mt-2 space-y-1">
                          <li>• Feed conversion efficiency</li>
                          <li>• Revenue per bird</li>
                        </ul>
                      </div>

                      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-yellow-800 dark:text-yellow-200">Good Performance</span>
                          <Badge variant="secondary">Average</Badge>
                        </div>
                        <ul className="text-sm text-yellow-700 dark:text-yellow-300 mt-2 space-y-1">
                          <li>• Daily production consistency</li>
                          <li>• Overall profitability</li>
                        </ul>
                      </div>

                      <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-orange-800 dark:text-orange-200">Needs Improvement</span>
                          <Badge variant="outline">Below Target</Badge>
                        </div>
                        <ul className="text-sm text-orange-700 dark:text-orange-300 mt-2 space-y-1">
                          <li>• Laying rate optimization</li>
                          <li>• Mortality rate reduction</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="trends">
              <div className="grid grid-cols-1 gap-6">
                <Card data-testid="card-trends-analysis">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Trends & Forecasts</CardTitle>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleExportReport("Trends")}
                        data-testid="button-export-trends"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {monthlyTrendsData.length > 0 ? (
                      <>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div>
                            <h4 className="text-sm font-medium mb-4">Production Trend Analysis</h4>
                            <ResponsiveContainer width="100%" height={280}>
                              <BarChart data={monthlyTrendsData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                  dataKey="month" 
                                  tick={{ fontSize: 11 }}
                                  angle={-45}
                                  textAnchor="end"
                                  height={80}
                                />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip />
                                <Legend />
                                <Bar 
                                  dataKey="eggs" 
                                  fill="#8884d8" 
                                  name="Eggs Produced"
                                  radius={[4, 4, 0, 0]}
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>

                          <div>
                            <h4 className="text-sm font-medium mb-4">Revenue Forecasting</h4>
                            <ResponsiveContainer width="100%" height={280}>
                              <LineChart data={trendsWithForecast}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                  dataKey="month" 
                                  tick={{ fontSize: 11 }}
                                  angle={-45}
                                  textAnchor="end"
                                  height={80}
                                />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip 
                                  formatter={(value: number) => `KSh ${value.toLocaleString()}`}
                                />
                                <Legend />
                                <Line 
                                  type="monotone" 
                                  dataKey="revenue" 
                                  stroke="#10b981" 
                                  strokeWidth={2}
                                  name="Revenue"
                                  strokeDasharray={(entry) => entry.isForecast ? "5 5" : "0"}
                                  dot={{ r: 3 }}
                                />
                                <Line 
                                  type="monotone" 
                                  dataKey="expenses" 
                                  stroke="#ef4444" 
                                  strokeWidth={2}
                                  name="Expenses"
                                  strokeDasharray={(entry) => entry.isForecast ? "5 5" : "0"}
                                  dot={{ r: 3 }}
                                />
                                <Line 
                                  type="monotone" 
                                  dataKey="profit" 
                                  stroke="#3b82f6" 
                                  strokeWidth={2}
                                  name="Profit"
                                  strokeDasharray={(entry) => entry.isForecast ? "5 5" : "0"}
                                  dot={{ r: 3 }}
                                />
                                <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                          <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Key Insights</h3>
                          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                            <li>• Production has {productionChange >= 0 ? 'increased' : 'decreased'} by {Math.abs(productionChange).toFixed(1)}% compared to the first month</li>
                            <li>• Average monthly profit: KSh {avgProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</li>
                            <li>• {isProfitable ? 'Farm is operating profitably' : 'Focus on reducing costs to improve profitability'}</li>
                            <li>• Forecasted revenue shows {growthRate > 0 ? 'positive growth' : 'stable performance'} for next 3 months</li>
                          </ul>
                        </div>
                      </>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="h-80 bg-muted/20 rounded-lg flex items-center justify-center">
                          <div className="text-center">
                            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-sm text-muted-foreground">No production data available</p>
                            <p className="text-xs text-muted-foreground mt-2">Add monthly records to see trends</p>
                          </div>
                        </div>

                        <div className="h-80 bg-muted/20 rounded-lg flex items-center justify-center">
                          <div className="text-center">
                            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-sm text-muted-foreground">No sales data available</p>
                            <p className="text-xs text-muted-foreground mt-2">Add sales records to see forecasts</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="breakeven">
              <div className="space-y-6">
                {/* Rolling Window Selector */}
                <Card data-testid="card-rolling-window">
                  <CardHeader>
                    <CardTitle>Analysis Period</CardTitle>
                    <CardDescription>
                      Select historical data timeframe for calculations
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Tabs 
                      value={rollingWindow.toString()} 
                      onValueChange={(v) => setRollingWindow(parseInt(v) as 3 | 6 | 12)}
                    >
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="3" data-testid="tab-3months">3 Months</TabsTrigger>
                        <TabsTrigger value="6" data-testid="tab-6months">6 Months</TabsTrigger>
                        <TabsTrigger value="12" data-testid="tab-12months">12 Months</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </CardContent>
                </Card>

                {/* No Data State */}
                {!breakEvenLoading && breakEvenMetrics && !breakEvenMetrics.hasData ? (
                  <div className="space-y-4">
                    <Alert data-testid="alert-no-data">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {breakEvenMetrics.message || "No data found for analysis"}
                      </AlertDescription>
                    </Alert>

                    <Card>
                      <CardHeader>
                        <CardTitle>Get Started</CardTitle>
                        <CardDescription>
                          Add sales and expense records to enable break-even analysis
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {breakEvenMetrics.suggestedActions?.map((action, idx) => (
                          <Link key={idx} href={action.route}>
                            <Button 
                              variant="outline" 
                              className="w-full justify-between"
                              data-testid={`button-${action.route.replace('/', '')}`}
                            >
                              {action.label}
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <>
                    {/* Data Source Banner */}
                    {breakEvenMetrics?.dataSource && (
                      <Alert data-testid="alert-data-source">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Auto-Calculated:</strong> Analyzing {breakEvenMetrics.dataSource.monthsAnalyzed} months 
                          ({breakEvenMetrics.dataSource.salesRecords} sales records, {breakEvenMetrics.dataSource.expenseRecords} expense records)
                          from {new Date(breakEvenMetrics.dataSource.dateRange.startDate).toLocaleDateString()} to {new Date(breakEvenMetrics.dataSource.dateRange.endDate).toLocaleDateString()}
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Derived Values Summary */}
                    {breakEvenLoading ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Card key={i}>
                            <CardHeader className="pb-2">
                              <Skeleton className="h-4 w-24" />
                            </CardHeader>
                            <CardContent>
                              <Skeleton className="h-6 w-20" />
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : breakEvenMetrics?.derivedValues ? (
                      <>
                        <div className="text-sm font-semibold text-muted-foreground mb-2">Calculated from Your Data</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                          <Card data-testid="card-avg-price">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-xs font-medium text-muted-foreground">
                                Avg Price/Crate
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-xl font-bold" data-testid="text-avg-price">
                                {formatCurrency(breakEvenMetrics.derivedValues.averagePrice)}
                              </div>
                            </CardContent>
                          </Card>

                          <Card data-testid="card-avg-variable-cost">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-xs font-medium text-muted-foreground">
                                Avg Variable Cost
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-xl font-bold" data-testid="text-avg-variable-cost">
                                {formatCurrency(breakEvenMetrics.derivedValues.averageUnitVariableCost)}
                              </div>
                            </CardContent>
                          </Card>

                          <Card data-testid="card-avg-fixed-costs">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-xs font-medium text-muted-foreground">
                                Avg Fixed Costs/Month
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-xl font-bold" data-testid="text-avg-fixed-costs">
                                {formatCurrency(breakEvenMetrics.derivedValues.averageFixedCostsPerMonth)}
                              </div>
                            </CardContent>
                          </Card>

                          <Card data-testid="card-avg-units">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-xs font-medium text-muted-foreground">
                                Avg Monthly Units
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-xl font-bold" data-testid="text-avg-units">
                                {breakEvenMetrics.derivedValues.averageMonthlyUnits} crates
                              </div>
                            </CardContent>
                          </Card>

                          <Card data-testid="card-growth-rate">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-xs font-medium text-muted-foreground">
                                Growth Rate (CAGR)
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-xl font-bold" data-testid="text-growth-rate">
                                {(breakEvenMetrics.derivedValues.calculatedGrowthRate ?? 0).toFixed(2)}%
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </>
                    ) : null}

                    {/* Interactive Navigation */}
                    <Card data-testid="card-navigation">
                      <CardHeader>
                        <CardTitle>Adjust Your Data</CardTitle>
                        <CardDescription>
                          Update sales, expenses, or feed to see real-time changes in your break-even analysis
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Link href="/egg-production">
                          <Button 
                            variant="outline" 
                            className="w-full justify-between"
                            data-testid="button-goto-sales"
                          >
                            <div className="flex items-center gap-2">
                              <ShoppingCart className="h-4 w-4" />
                              Manage Sales
                            </div>
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </Link>
                        
                        <Link href="/expenses">
                          <Button 
                            variant="outline" 
                            className="w-full justify-between"
                            data-testid="button-goto-expenses"
                          >
                            <div className="flex items-center gap-2">
                              <CostsIcon className="h-4 w-4" />
                              Manage Expenses
                            </div>
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </Link>
                        
                        <Link href="/feed-management">
                          <Button 
                            variant="outline" 
                            className="w-full justify-between"
                            data-testid="button-goto-feed"
                          >
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4" />
                              Feed Management
                            </div>
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>

                    {/* Break-Even Metrics */}
                    {breakEvenLoading ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                          <Card key={i}>
                            <CardHeader className="pb-2">
                              <Skeleton className="h-4 w-24" />
                            </CardHeader>
                            <CardContent>
                              <Skeleton className="h-8 w-32" />
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : breakEvenMetrics && breakEvenMetrics.breakEvenUnits !== undefined ? (
                      <>
                        <div className="text-sm font-semibold text-muted-foreground mb-2">Break-Even Projections</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <Card data-testid="card-break-even-units">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-medium text-muted-foreground">
                                Break-Even Units
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="flex items-center gap-2">
                                <Calculator className="h-5 w-5 text-blue-500" />
                                <span className="text-2xl font-bold" data-testid="text-break-even-units">
                                  {breakEvenMetrics.breakEvenUnits.toFixed(0)} crates
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">Per month</p>
                            </CardContent>
                          </Card>

                          <Card data-testid="card-break-even-revenue">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-medium text-muted-foreground">
                                Break-Even Revenue
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-5 w-5 text-green-500" />
                                <span className="text-2xl font-bold" data-testid="text-break-even-revenue">
                                  {formatCurrency(breakEvenMetrics.breakEvenRevenue || 0)}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">Per month</p>
                            </CardContent>
                          </Card>

                          <Card data-testid="card-break-even-month">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-medium text-muted-foreground">
                                Break-Even Month
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-purple-500" />
                                <span className="text-2xl font-bold" data-testid="text-break-even-month">
                                  {breakEvenMetrics.breakEvenMonth !== null ? `Month ${breakEvenMetrics.breakEvenMonth}` : "Not Reachable"}
                                </span>
                              </div>
                              {breakEvenMetrics.breakEvenDate && (
                                <p className="text-xs text-muted-foreground mt-1" data-testid="text-break-even-date">
                                  {new Date(breakEvenMetrics.breakEvenDate).toLocaleDateString()}
                                </p>
                              )}
                            </CardContent>
                          </Card>

                          <Card data-testid="card-contribution-margin">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-medium text-muted-foreground">
                                Contribution Margin
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-orange-500" />
                                <span className="text-2xl font-bold" data-testid="text-contribution-margin">
                                  {breakEvenMetrics.contributionMarginRatio?.toFixed(1)}%
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatCurrency(breakEvenMetrics.contributionMargin || 0)} per unit
                              </p>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Not Reachable Warning */}
                        {breakEvenMetrics.breakEvenMonth === null && (
                          <Alert data-testid="alert-not-reachable">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              Break-even is not reachable within the 12-month projection period with current data trends.
                              Consider adjusting your prices or reducing costs.
                            </AlertDescription>
                          </Alert>
                        )}

                        {/* Charts */}
                        {breakEvenMetrics.monthlyProjections && breakEvenMetrics.monthlyProjections.length > 0 && (
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Cumulative Profit Chart */}
                            <Card data-testid="card-cumulative-profit-chart">
                              <CardHeader>
                                <CardTitle>Cumulative Profit Over Time</CardTitle>
                                <CardDescription>Track when you'll reach profitability</CardDescription>
                              </CardHeader>
                              <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                  <LineChart data={breakEvenMetrics.monthlyProjections}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" label={{ value: "Month", position: "insideBottom", offset: -5 }} />
                                    <YAxis label={{ value: "Profit (KES)", angle: -90, position: "insideLeft" }} />
                                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                                    <Legend />
                                    <ReferenceLine y={0} stroke="#000" strokeDasharray="3 3" />
                                    {breakEvenMetrics.breakEvenMonth !== null && (
                                      <ReferenceLine
                                        x={breakEvenMetrics.breakEvenMonth}
                                        stroke="#22c55e"
                                        strokeDasharray="3 3"
                                        label={{ value: "Break-Even", position: "top" }}
                                      />
                                    )}
                                    <Line
                                      type="monotone"
                                      dataKey="cumulativeProfit"
                                      stroke="#8b5cf6"
                                      strokeWidth={2}
                                      name="Cumulative Profit"
                                    />
                                  </LineChart>
                                </ResponsiveContainer>
                              </CardContent>
                            </Card>

                            {/* Revenue vs Costs Chart */}
                            <Card data-testid="card-revenue-costs-chart">
                              <CardHeader>
                                <CardTitle>Revenue vs Total Costs</CardTitle>
                                <CardDescription>Monthly comparison</CardDescription>
                              </CardHeader>
                              <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                  <BarChart data={breakEvenMetrics.monthlyProjections}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" label={{ value: "Month", position: "insideBottom", offset: -5 }} />
                                    <YAxis label={{ value: "Amount (KES)", angle: -90, position: "insideLeft" }} />
                                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                                    <Legend />
                                    <Bar dataKey="revenue" fill="#22c55e" name="Revenue" />
                                    <Bar dataKey="totalCosts" fill="#ef4444" name="Total Costs" />
                                  </BarChart>
                                </ResponsiveContainer>
                              </CardContent>
                            </Card>
                          </div>
                        )}

                        {/* Monthly Projections Table */}
                        {breakEvenMetrics.monthlyProjections && breakEvenMetrics.monthlyProjections.length > 0 && (
                          <Card data-testid="card-monthly-projections">
                            <CardHeader>
                              <div className="flex items-center justify-between">
                                <div>
                                  <CardTitle>Monthly Projections</CardTitle>
                                  <CardDescription>Detailed breakdown of revenue and costs</CardDescription>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={downloadBreakEvenCSV}
                                    data-testid="button-download-csv"
                                  >
                                    <Download className="h-4 w-4 mr-2" />
                                    CSV
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={downloadBreakEvenPDF}
                                    data-testid="button-download-pdf"
                                  >
                                    <FileText className="h-4 w-4 mr-2" />
                                    PDF
                                  </Button>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b">
                                      <th className="text-left p-2">Month</th>
                                      <th className="text-right p-2">Units</th>
                                      <th className="text-right p-2">Revenue</th>
                                      <th className="text-right p-2">Variable</th>
                                      <th className="text-right p-2">Fixed</th>
                                      <th className="text-right p-2">Total Costs</th>
                                      <th className="text-right p-2">Profit</th>
                                      <th className="text-right p-2">Cumulative</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {breakEvenMetrics.monthlyProjections.map((projection, idx) => (
                                      <tr
                                        key={idx}
                                        className={`border-b ${projection.cumulativeProfit >= 0 ? 'bg-green-50 dark:bg-green-950/20' : ''}`}
                                        data-testid={`row-projection-${idx}`}
                                      >
                                        <td className="p-2">{projection.month}</td>
                                        <td className="text-right p-2">{projection.units.toFixed(0)}</td>
                                        <td className="text-right p-2">{formatCurrency(projection.revenue)}</td>
                                        <td className="text-right p-2">{formatCurrency(projection.variableCosts)}</td>
                                        <td className="text-right p-2">{formatCurrency(projection.fixedCosts)}</td>
                                        <td className="text-right p-2">{formatCurrency(projection.totalCosts)}</td>
                                        <td className={`text-right p-2 ${projection.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                          {formatCurrency(projection.profit)}
                                        </td>
                                        <td className={`text-right p-2 font-semibold ${projection.cumulativeProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                          {formatCurrency(projection.cumulativeProfit)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </>
                    ) : null}
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
