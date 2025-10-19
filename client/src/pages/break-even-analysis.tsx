import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  TrendingUp, Calculator, DollarSign, Calendar, Download, AlertCircle, 
  FileText, ArrowRight, ShoppingCart, DollarSign as CostsIcon, Package 
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
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

export default function BreakEvenAnalysis() {
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rollingWindow, setRollingWindow] = useState<3 | 6 | 12>(6);

  // Fetch auto-calculated metrics with rolling window
  const { data: metrics, isLoading } = useQuery<BreakEvenMetrics>({
    queryKey: [`/api/breakeven/metrics?months=${rollingWindow}`],
    refetchOnWindowFocus: true, // Auto-refresh when user returns from linked pages
  });

  // Download CSV
  const downloadCSV = () => {
    if (!metrics?.monthlyProjections) return;

    const headers = [
      "Month", "Units", "Revenue", "Variable Costs", "Fixed Costs", 
      "Total Costs", "Profit", "Cumulative Profit"
    ];
    const rows = metrics.monthlyProjections.map(m => [
      m.month,
      m.units,
      m.revenue,
      m.variableCosts,
      m.fixedCosts,
      m.totalCosts,
      m.profit,
      m.cumulativeProfit,
    ]);

    // Add summary section
    const summaryRows = [
      [""],
      ["AUTO-CALCULATED METRICS"],
      ["Data Source", `${metrics.dataSource?.monthsAnalyzed || 0} months of historical data`],
      ["Sales Records", metrics.dataSource?.salesRecords || 0],
      ["Expense Records", metrics.dataSource?.expenseRecords || 0],
      [""],
    ];

    // Only add derived values if they exist
    if (metrics.derivedValues) {
      summaryRows.push(
        ["DERIVED VALUES"],
        ["Average Price/Crate", `$${metrics.derivedValues.averagePrice.toFixed(2)}`],
        ["Avg Variable Cost/Crate", `$${metrics.derivedValues.averageUnitVariableCost.toFixed(2)}`],
        ["Avg Fixed Costs/Month", `$${metrics.derivedValues.averageFixedCostsPerMonth.toFixed(2)}`],
        ["Avg Monthly Units", metrics.derivedValues.averageMonthlyUnits.toString()],
        ["Calculated Growth Rate", `${metrics.derivedValues.calculatedGrowthRate.toFixed(2)}%`]
      );
    }

    const csvContent = [
      ...summaryRows.map(row => row.join(",")),
      [""],
      headers.join(","),
      ...rows.map(row => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `break-even-analysis-${rollingWindow}months-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Download Started",
      description: "CSV file with auto-calculated metrics is being downloaded",
    });
  };

  // Download PDF (via print)
  const downloadPDF = () => {
    window.print();
    toast({
      title: "Print Dialog Opened",
      description: "Use your browser's print dialog to save as PDF",
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  // Missing Data State
  if (!isLoading && metrics && !metrics.hasData) {
    return (
      <div className="min-h-screen flex bg-background">
        <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
        <div className="flex-1 overflow-x-hidden">
          <div className="container mx-auto p-4 md:p-6 space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Break-Even Analysis</h1>
              <p className="text-muted-foreground mt-1">
                Automatically calculated from your farm data
              </p>
            </div>

            <Alert data-testid="alert-missing-data">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {metrics.message || "No data found for analysis"}
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
                {metrics.suggestedActions?.map((action, idx) => (
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex-1 overflow-x-hidden">
        <div className="container mx-auto p-4 md:p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Break-Even Analysis</h1>
              <p className="text-muted-foreground mt-1">
                Automatically calculated from your farm data
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={downloadCSV}
                disabled={!metrics?.monthlyProjections}
                data-testid="button-download-csv"
              >
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadPDF}
                disabled={!metrics?.monthlyProjections}
                data-testid="button-download-pdf"
              >
                <FileText className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>

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

          {/* Data Source Banner */}
          {metrics?.dataSource && (
            <Alert data-testid="alert-data-source">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Auto-Calculated:</strong> Analyzing {metrics.dataSource.monthsAnalyzed} months 
                ({metrics.dataSource.salesRecords} sales records, {metrics.dataSource.expenseRecords} expense records)
                from {new Date(metrics.dataSource.dateRange.startDate).toLocaleDateString()} to {new Date(metrics.dataSource.dateRange.endDate).toLocaleDateString()}
              </AlertDescription>
            </Alert>
          )}

          {/* Derived Values Summary */}
          {isLoading ? (
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
          ) : metrics?.derivedValues ? (
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
                      {formatCurrency(metrics.derivedValues.averagePrice)}
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
                      {formatCurrency(metrics.derivedValues.averageUnitVariableCost)}
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
                      {formatCurrency(metrics.derivedValues.averageFixedCostsPerMonth)}
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
                      {metrics.derivedValues.averageMonthlyUnits} crates
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
                      {metrics.derivedValues.calculatedGrowthRate.toFixed(2)}%
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
          {isLoading ? (
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
          ) : metrics && metrics.breakEvenUnits !== undefined ? (
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
                        {metrics.breakEvenUnits.toFixed(0)} crates
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
                        {formatCurrency(metrics.breakEvenRevenue || 0)}
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
                        {metrics.breakEvenMonth !== null ? `Month ${metrics.breakEvenMonth}` : "Not Reachable"}
                      </span>
                    </div>
                    {metrics.breakEvenDate && (
                      <p className="text-xs text-muted-foreground mt-1" data-testid="text-break-even-date">
                        {new Date(metrics.breakEvenDate).toLocaleDateString()}
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
                        {metrics.contributionMarginRatio?.toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatCurrency(metrics.contributionMargin || 0)} per unit
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Not Reachable Warning */}
              {metrics.breakEvenMonth === null && (
                <Alert data-testid="alert-not-reachable">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Break-even is not reachable within the 12-month projection period with current data trends.
                    Consider adjusting your prices or reducing costs.
                  </AlertDescription>
                </Alert>
              )}

              {/* Charts */}
              {metrics.monthlyProjections && metrics.monthlyProjections.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Cumulative Profit Chart */}
                  <Card data-testid="card-cumulative-profit-chart">
                    <CardHeader>
                      <CardTitle>Cumulative Profit Over Time</CardTitle>
                      <CardDescription>Track when you'll reach profitability</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={metrics.monthlyProjections}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" label={{ value: "Month", position: "insideBottom", offset: -5 }} />
                          <YAxis label={{ value: "Profit ($)", angle: -90, position: "insideLeft" }} />
                          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                          <Legend />
                          <ReferenceLine y={0} stroke="#000" strokeDasharray="3 3" />
                          {metrics.breakEvenMonth !== null && (
                            <ReferenceLine
                              x={metrics.breakEvenMonth}
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
                        <BarChart data={metrics.monthlyProjections}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" label={{ value: "Month", position: "insideBottom", offset: -5 }} />
                          <YAxis label={{ value: "Amount ($)", angle: -90, position: "insideLeft" }} />
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
              {metrics.monthlyProjections && metrics.monthlyProjections.length > 0 && (
                <Card data-testid="card-monthly-projections">
                  <CardHeader>
                    <CardTitle>Monthly Projections</CardTitle>
                    <CardDescription>Detailed breakdown of revenue and costs</CardDescription>
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
                          {metrics.monthlyProjections.map((projection, idx) => (
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
        </div>
      </div>
    </div>
  );
}
