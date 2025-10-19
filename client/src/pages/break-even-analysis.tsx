import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TrendingUp, Calculator, DollarSign, Calendar, Download, AlertCircle, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
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

// Form schema for break-even assumptions
const assumptionsFormSchema = z.object({
  price: z.coerce.number().min(0.01, "Price must be greater than 0"),
  unitVariableCost: z.coerce.number().min(0, "Unit variable cost must be non-negative"),
  fixedCostsPerMonth: z.coerce.number().min(0, "Fixed costs must be non-negative"),
  growthRate: z.coerce.number().min(-1, "Growth rate must be >= -100%").max(10, "Growth rate must be <= 1000%"),
  notes: z.string().optional(),
});

type AssumptionsFormValues = z.infer<typeof assumptionsFormSchema>;

interface BreakEvenMetrics {
  contributionMargin: number;
  contributionMarginRatio: number;
  breakEvenUnits: number;
  breakEvenRevenue: number;
  breakEvenMonth: number | null;
  breakEvenDate: string | null;
  paybackPeriod: number | null;
  cumulativeProfits: number[];
  monthlyProjections: Array<{
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
  const [showForm, setShowForm] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch assumptions
  const { data: assumptions, isLoading: loadingAssumptions } = useQuery<{
    price: string;
    unitVariableCost: string;
    fixedCostsPerMonth: string;
    growthRate: string;
    notes: string | null;
  }>({
    queryKey: ["/api/breakeven/assumptions"],
    retry: false,
  });

  // Fetch metrics
  const { data: metrics, isLoading: loadingMetrics, error: metricsError } = useQuery<BreakEvenMetrics>({
    queryKey: ["/api/breakeven/metrics"],
    retry: false,
  });

  // Form setup
  const form = useForm<AssumptionsFormValues>({
    resolver: zodResolver(assumptionsFormSchema),
    defaultValues: {
      price: 0,
      unitVariableCost: 0,
      fixedCostsPerMonth: 0,
      growthRate: 0,
      notes: "",
    },
  });

  // Update form when assumptions load
  useEffect(() => {
    if (assumptions && !form.formState.isDirty) {
      form.reset({
        price: parseFloat(assumptions.price || '0'),
        unitVariableCost: parseFloat(assumptions.unitVariableCost || '0'),
        fixedCostsPerMonth: parseFloat(assumptions.fixedCostsPerMonth || '0'),
        growthRate: parseFloat(assumptions.growthRate || '0'),
        notes: assumptions.notes || "",
      });
    }
  }, [assumptions, form]);

  // Save assumptions mutation
  const saveMutation = useMutation({
    mutationFn: async (values: AssumptionsFormValues) => {
      return apiRequest("PUT", "/api/breakeven/assumptions", values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/breakeven/assumptions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/breakeven/metrics"] });
      toast({
        title: "Success",
        description: "Break-even assumptions saved successfully",
      });
      setShowForm(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save assumptions",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: AssumptionsFormValues) => {
    saveMutation.mutate(values);
  };

  // Download CSV
  const downloadCSV = () => {
    if (!metrics) return;

    const headers = ["Month", "Units", "Revenue", "Variable Costs", "Fixed Costs", "Total Costs", "Profit", "Cumulative Profit"];
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

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `break-even-analysis-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Download Started",
      description: "CSV file is being downloaded",
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
                Calculate when your farm will reach profitability
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={downloadCSV}
                disabled={!metrics}
                data-testid="button-download-csv"
              >
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadPDF}
                disabled={!metrics}
                data-testid="button-download-pdf"
              >
                <FileText className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>

          {/* Assumptions Form */}
          {showForm && (
            <Card data-testid="card-assumptions-form">
              <CardHeader>
                <CardTitle>Financial Assumptions</CardTitle>
                <CardDescription>
                  Enter your pricing and cost assumptions to calculate break-even metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingAssumptions ? (
                  <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="price"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Price per Unit (Crate)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  {...field}
                                  data-testid="input-price"
                                />
                              </FormControl>
                              <FormDescription>Selling price per crate of eggs</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="unitVariableCost"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Variable Cost per Unit</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  {...field}
                                  data-testid="input-variable-cost"
                                />
                              </FormControl>
                              <FormDescription>Feed and medication costs per crate</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="fixedCostsPerMonth"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Fixed Costs per Month</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  {...field}
                                  data-testid="input-fixed-costs"
                                />
                              </FormControl>
                              <FormDescription>Labor, utilities, equipment per month</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="growthRate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Monthly Growth Rate (%)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  {...field}
                                  data-testid="input-growth-rate"
                                />
                              </FormControl>
                              <FormDescription>Expected monthly increase (e.g., 0.05 for 5%)</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notes</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Additional notes or assumptions..."
                                className="resize-none"
                                {...field}
                                data-testid="input-notes"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex gap-2">
                        <Button
                          type="submit"
                          disabled={saveMutation.isPending}
                          data-testid="button-save-assumptions"
                        >
                          {saveMutation.isPending ? "Saving..." : "Calculate Break-Even"}
                        </Button>
                        {assumptions && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowForm(false)}
                            data-testid="button-hide-form"
                          >
                            Hide Form
                          </Button>
                        )}
                      </div>
                    </form>
                  </Form>
                )}
              </CardContent>
            </Card>
          )}

          {!showForm && (
            <Button
              variant="outline"
              onClick={() => setShowForm(true)}
              data-testid="button-show-form"
            >
              Edit Assumptions
            </Button>
          )}

          {/* Error State */}
          {metricsError && (
            <Alert variant="destructive" data-testid="alert-metrics-error">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {(metricsError as Error).message || "Failed to load break-even metrics. Please set up your assumptions first."}
              </AlertDescription>
            </Alert>
          )}

          {/* Results Cards */}
          {loadingMetrics ? (
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
          ) : metrics ? (
            <>
              {/* Key Metrics */}
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
                        {formatCurrency(metrics.breakEvenRevenue)}
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
                        {metrics.contributionMarginRatio.toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatCurrency(metrics.contributionMargin)} per unit
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Not Reachable Warning */}
              {metrics.breakEvenMonth === null && (
                <Alert data-testid="alert-not-reachable">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Break-even is not reachable within the 12-month projection period with current assumptions.
                    Consider increasing price, reducing variable costs, or reducing fixed costs.
                  </AlertDescription>
                </Alert>
              )}

              {/* Charts */}
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

              {/* Monthly Projections Table */}
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
                          <th className="text-right p-2">Var. Costs</th>
                          <th className="text-right p-2">Fixed Costs</th>
                          <th className="text-right p-2">Profit</th>
                          <th className="text-right p-2">Cum. Profit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.monthlyProjections.map((projection, idx) => (
                          <tr
                            key={idx}
                            className={`border-b ${projection.month === metrics.breakEvenMonth ? "bg-green-50 dark:bg-green-950" : ""}`}
                            data-testid={`row-projection-${projection.month}`}
                          >
                            <td className="p-2">{projection.month}</td>
                            <td className="text-right p-2">{projection.units.toFixed(0)}</td>
                            <td className="text-right p-2">{formatCurrency(projection.revenue)}</td>
                            <td className="text-right p-2">{formatCurrency(projection.variableCosts)}</td>
                            <td className="text-right p-2">{formatCurrency(projection.fixedCosts)}</td>
                            <td className={`text-right p-2 ${projection.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {formatCurrency(projection.profit)}
                            </td>
                            <td className={`text-right p-2 font-semibold ${projection.cumulativeProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {formatCurrency(projection.cumulativeProfit)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
