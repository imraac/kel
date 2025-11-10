import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useFarmContext } from "@/contexts/FarmContext";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Receipt, TrendingUp, Calendar, AlertCircle, Plus, Menu, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertExpenseSchema } from "@shared/schema";
import { z } from "zod";
import { Textarea } from "@/components/ui/textarea";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Expense form schema - use the actual database schema for consistency
const expenseFormSchema = insertExpenseSchema.pick({
  expenseDate: true,
  category: true, 
  description: true,
  amount: true,
  supplier: true,
  receiptNumber: true,
  notes: true,
}).extend({
  // Override date field to handle string input from HTML date inputs
  expenseDate: z.string().min(1, "Expense date is required"),
  // Override amount to handle string input like health record pattern
  amount: z.string().min(1, "Amount is required").refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    "Invalid amount - must be a positive number"
  ),
});

type ExpenseFormData = z.infer<typeof expenseFormSchema>;

export default function Expenses() {
  const { toast } = useToast();
  const { isLoading, isAuthenticated } = useAuth();
  const { activeFarmId, hasActiveFarm, error: farmError } = useFarmContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
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

  const { data: expenses = [], error: expensesError } = useQuery<any[]>({
    queryKey: ["/api/expenses", activeFarmId],
    queryFn: async () => {
      const response = await fetch(`/api/expenses?farmId=${activeFarmId}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch expenses');
      return response.json();
    },
    enabled: isAuthenticated && hasActiveFarm && !!activeFarmId,
  });

  // Handle unauthorized errors
  useEffect(() => {
    if (expensesError && isUnauthorizedError(expensesError)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [expensesError, toast]);

  const expenseForm = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      expenseDate: new Date().toISOString().split('T')[0],
      category: "feed",
      description: "",
      amount: "",
      supplier: "",
      receiptNumber: "",
      notes: "",
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: async (data: ExpenseFormData) => {
      // Include farmId for admin users, server will handle type coercion
      const payload = { ...data, farmId: activeFarmId };
      await apiRequest("POST", "/api/expenses", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses", activeFarmId] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics", activeFarmId] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/activity", activeFarmId] });
      toast({
        title: "Success",
        description: "Expense recorded successfully",
      });
      expenseForm.reset();
      setExpenseDialogOpen(false);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: error.message || "Failed to record expense",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading expenses...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Calculate expense metrics
  const totalExpenses = expenses?.reduce((sum: number, expense: any) => sum + parseFloat(expense.amount || '0'), 0) || 0;
  
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const monthExpenses = expenses?.filter((expense: any) => expense.expenseDate >= monthStart) || [];
  const monthlyTotal = monthExpenses.reduce((sum: number, expense: any) => sum + parseFloat(expense.amount || '0'), 0);

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const weekExpenses = expenses?.filter((expense: any) => new Date(expense.expenseDate) >= weekStart) || [];
  const weeklyTotal = weekExpenses.reduce((sum: number, expense: any) => sum + parseFloat(expense.amount || '0'), 0);

  // Category breakdown
  const categoryTotals = expenses?.reduce((acc: any, expense: any) => {
    const category = expense.category || 'other';
    acc[category] = (acc[category] || 0) + parseFloat(expense.amount || '0');
    return acc;
  }, {}) || {};

  const topCategories = Object.entries(categoryTotals)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 4);

  const onSubmitExpense = (data: ExpenseFormData) => {
    // Early guard: Prevent submission without active farm
    if (!hasActiveFarm) {
      toast({
        title: "Farm Required",
        description: "Please select a farm before adding expenses",
        variant: "destructive",
      });
      return;
    }
    createExpenseMutation.mutate(data);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'feed': return '🌾';
      case 'medication': return '💊';
      case 'labor': return '👥';
      case 'utilities': return '⚡';
      case 'equipment': return '🔧';
      default: return '📄';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'feed': return 'bg-orange-100 text-orange-600';
      case 'medication': return 'bg-red-100 text-red-600';
      case 'labor': return 'bg-blue-100 text-blue-600';
      case 'utilities': return 'bg-green-100 text-green-600';
      case 'equipment': return 'bg-purple-100 text-purple-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  // Monthly expense aggregation for trend chart (last 12 calendar months)
  const monthlyExpenseTrends = useMemo(() => {
    // Helper to get stable month key (yyyy-mm format) using UTC
    const getMonthKey = (date: Date): string => {
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      return `${year}-${month}`;
    };

    // Helper to format month for display
    const formatMonthDisplay = (monthKey: string): string => {
      const [year, month] = monthKey.split('-');
      const date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, 1));
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', timeZone: 'UTC' });
    };

    // Calculate trailing 12 calendar months in UTC
    const now = new Date();
    const nowUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    
    // Generate last 12 calendar months using UTC
    const monthKeys: string[] = [];
    const startDate = new Date(Date.UTC(nowUTC.getUTCFullYear(), nowUTC.getUTCMonth() - 11, 1));
    
    for (let i = 0; i < 12; i++) {
      const monthDate = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + i, 1));
      monthKeys.push(getMonthKey(monthDate));
    }
    
    // Date range for filtering (start of first month to end of last month)
    const startOfTrailingPeriod = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));
    const endOfCurrentMonth = new Date(Date.UTC(nowUTC.getUTCFullYear(), nowUTC.getUTCMonth() + 1, 0, 23, 59, 59, 999));

    // Aggregate actual expenses by month with explicit date range filtering
    const monthlyData: { [key: string]: number } = {};
    if (expenses && expenses.length > 0) {
      expenses.forEach((expense: any) => {
        // Parse expense date - handle both date-only (YYYY-MM-DD) and ISO timestamp formats
        const dateStr = expense.expenseDate;
        const expenseDate = dateStr.includes('T') 
          ? new Date(dateStr) // Already has time component
          : new Date(`${dateStr}T00:00:00Z`); // Add UTC time for date-only strings
        
        // Only include if within trailing 12 months date range
        if (expenseDate >= startOfTrailingPeriod && expenseDate <= endOfCurrentMonth) {
          const monthKey = getMonthKey(expenseDate);
          monthlyData[monthKey] = (monthlyData[monthKey] || 0) + parseFloat(expense.amount || '0');
        }
      });
    }

    // Create final dataset with zero-filled months
    return monthKeys.map(monthKey => ({
      monthKey,
      month: formatMonthDisplay(monthKey),
      amount: monthlyData[monthKey] || 0,
    }));
  }, [expenses]);

  // Category trends aggregation (last 6 months by category)
  const categoryTrendsData = useMemo(() => {
    const getMonthKey = (date: Date): string => {
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      return `${year}-${month}`;
    };

    const formatMonthDisplay = (monthKey: string): string => {
      const [year, month] = monthKey.split('-');
      const date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, 1));
      return date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
    };

    // Calculate last 6 calendar months in UTC
    const now = new Date();
    const nowUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const startDate = new Date(Date.UTC(nowUTC.getUTCFullYear(), nowUTC.getUTCMonth() - 5, 1));
    
    const monthKeys: string[] = [];
    for (let i = 0; i < 6; i++) {
      const monthDate = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + i, 1));
      monthKeys.push(getMonthKey(monthDate));
    }
    
    const startOfTrailingPeriod = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));
    const endOfCurrentMonth = new Date(Date.UTC(nowUTC.getUTCFullYear(), nowUTC.getUTCMonth() + 1, 0, 23, 59, 59, 999));

    // Aggregate by month AND category
    const monthCategoryData: { [key: string]: { [category: string]: number } } = {};
    const allCategories = new Set<string>();
    
    if (expenses && expenses.length > 0) {
      expenses.forEach((expense: any) => {
        const dateStr = expense.expenseDate;
        const expenseDate = dateStr.includes('T') 
          ? new Date(dateStr)
          : new Date(`${dateStr}T00:00:00Z`);
        
        if (expenseDate >= startOfTrailingPeriod && expenseDate <= endOfCurrentMonth) {
          const monthKey = getMonthKey(expenseDate);
          const category = expense.category || 'other';
          allCategories.add(category);
          
          if (!monthCategoryData[monthKey]) {
            monthCategoryData[monthKey] = {};
          }
          monthCategoryData[monthKey][category] = 
            (monthCategoryData[monthKey][category] || 0) + parseFloat(expense.amount || '0');
        }
      });
    }

    // Build final dataset with all categories for each month
    return monthKeys.map(monthKey => {
      const dataPoint: any = {
        monthKey,
        month: formatMonthDisplay(monthKey),
      };
      
      // Add each category as a separate field
      allCategories.forEach(category => {
        dataPoint[category] = monthCategoryData[monthKey]?.[category] || 0;
      });
      
      return dataPoint;
    });
  }, [expenses]);

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
                <h2 className="text-xl font-semibold text-foreground">Expenses</h2>
                <p className="text-sm text-muted-foreground">Track farm operating costs and expenses</p>
              </div>
            </div>
            
            <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  data-testid="button-add-expense"
                  disabled={!hasActiveFarm}
                  title={!hasActiveFarm ? "Please select a farm first" : ""}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Expense
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Record Expense</DialogTitle>
                </DialogHeader>
                <Form {...expenseForm}>
                  <form onSubmit={expenseForm.handleSubmit(onSubmitExpense)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={expenseForm.control}
                        name="expenseDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Expense Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} data-testid="input-expense-date" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={expenseForm.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-category">
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="feed">Feed</SelectItem>
                                <SelectItem value="medication">Medication</SelectItem>
                                <SelectItem value="labor">Labor</SelectItem>
                                <SelectItem value="utilities">Utilities</SelectItem>
                                <SelectItem value="equipment">Equipment</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={expenseForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Brief description of expense" data-testid="input-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={expenseForm.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount (KSh)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              {...field} 
                              placeholder="0.00"
                              data-testid="input-amount"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={expenseForm.control}
                        name="supplier"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Supplier (Optional)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Supplier name" data-testid="input-supplier" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={expenseForm.control}
                        name="receiptNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Receipt # (Optional)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Receipt number" data-testid="input-receipt-number" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={expenseForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes (Optional)</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={2} data-testid="textarea-notes" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={createExpenseMutation.isPending}
                      data-testid="button-submit-expense"
                    >
                      {createExpenseMutation.isPending ? "Recording..." : "Record Expense"}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-4 md:p-6 space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card data-testid="card-total-expenses">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
                    <p className="text-2xl font-bold text-foreground">KSh {totalExpenses.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">All time</p>
                  </div>
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <Receipt className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-monthly-expenses">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">This Month</p>
                    <p className="text-2xl font-bold text-foreground">KSh {monthlyTotal.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{monthExpenses.length} transactions</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-weekly-expenses">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">This Week</p>
                    <p className="text-2xl font-bold text-foreground">KSh {weeklyTotal.toLocaleString()}</p>
                    <p className="text-xs text-green-600">Weekly spending</p>
                  </div>
                  <div className="w-12 h-12 bg-chart-2/10 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-chart-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-average-daily">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Daily Average</p>
                    <p className="text-2xl font-bold text-foreground">KSh {Math.round(weeklyTotal / 7).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Last 7 days</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="recent" className="space-y-4">
            <TabsList>
              <TabsTrigger value="recent">Recent Expenses</TabsTrigger>
              <TabsTrigger value="categories">By Category</TabsTrigger>
              <TabsTrigger value="analysis">Expense Analysis</TabsTrigger>
            </TabsList>

            <TabsContent value="recent">
              <Card data-testid="card-recent-expenses">
                <CardHeader>
                  <CardTitle>Recent Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                  {!expenses || expenses.length === 0 ? (
                    <div className="text-center py-8">
                      <Receipt className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No expenses recorded</p>
                      <p className="text-sm text-muted-foreground mt-2">Start tracking your farm expenses</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left p-2 font-medium text-muted-foreground">Date</th>
                            <th className="text-left p-2 font-medium text-muted-foreground">Category</th>
                            <th className="text-left p-2 font-medium text-muted-foreground">Description</th>
                            <th className="text-left p-2 font-medium text-muted-foreground">Amount</th>
                            <th className="text-left p-2 font-medium text-muted-foreground">Supplier</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expenses.slice(0, 10).map((expense: any) => (
                            <tr key={expense.id} className="border-b border-border/50" data-testid={`row-expense-${expense.id}`}>
                              <td className="p-2">{new Date(expense.expenseDate).toLocaleDateString()}</td>
                              <td className="p-2">
                                <Badge variant="outline" className={`capitalize ${getCategoryColor(expense.category)}`}>
                                  {getCategoryIcon(expense.category)} {expense.category}
                                </Badge>
                              </td>
                              <td className="p-2 font-medium">{expense.description}</td>
                              <td className="p-2 font-medium text-red-600">KSh {parseFloat(expense.amount).toLocaleString()}</td>
                              <td className="p-2">{expense.supplier || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="categories">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card data-testid="card-category-breakdown">
                  <CardHeader>
                    <CardTitle>Expense by Category</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {topCategories.map(([category, amount]) => {
                        const percentage = totalExpenses > 0 ? ((amount as number) / totalExpenses * 100) : 0;
                        return (
                          <div key={category} className="flex items-center justify-between p-3 bg-muted/50 rounded">
                            <div className="flex items-center space-x-3">
                              <span className="text-2xl">{getCategoryIcon(category)}</span>
                              <div>
                                <p className="font-medium capitalize">{category}</p>
                                <p className="text-sm text-muted-foreground">{percentage.toFixed(1)}% of total</p>
                              </div>
                            </div>
                            <span className="font-medium">KSh {(amount as number).toLocaleString()}</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="card-category-trends">
                  <CardHeader>
                    <CardTitle>Category Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {categoryTrendsData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={320}>
                        <BarChart data={categoryTrendsData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            dataKey="month" 
                            className="text-xs"
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                          />
                          <YAxis 
                            className="text-xs"
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                          />
                          <Tooltip 
                            formatter={(value: number) => `KSh ${value.toLocaleString()}`}
                            contentStyle={{
                              backgroundColor: 'hsl(var(--background))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '6px',
                            }}
                          />
                          <Legend 
                            wrapperStyle={{ paddingTop: '20px' }}
                            formatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)}
                          />
                          <Bar dataKey="feed" stackId="a" fill="hsl(25, 95%, 53%)" />
                          <Bar dataKey="medication" stackId="a" fill="hsl(0, 84%, 60%)" />
                          <Bar dataKey="labor" stackId="a" fill="hsl(221, 83%, 53%)" />
                          <Bar dataKey="utilities" stackId="a" fill="hsl(142, 76%, 36%)" />
                          <Bar dataKey="equipment" stackId="a" fill="hsl(262, 83%, 58%)" />
                          <Bar dataKey="other" stackId="a" fill="hsl(215, 20%, 65%)" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-80 bg-muted/20 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-sm text-muted-foreground">No expense data available</p>
                          <p className="text-xs text-muted-foreground mt-2">Add expenses to see category trends</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="analysis">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card data-testid="card-spending-analysis">
                  <CardHeader>
                    <CardTitle>Spending Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                        <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Monthly Comparison</h3>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          This month's spending: KSh {monthlyTotal.toLocaleString()}
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          Average monthly: KSh {Math.round(totalExpenses / 3).toLocaleString()}
                        </p>
                      </div>

                      <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
                        <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">Cost Efficiency</h3>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          Cost per bird per month: KSh {Math.round(monthlyTotal / 5300).toLocaleString()}
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                          Industry benchmark: KSh 45-65 per bird/month
                        </p>
                      </div>

                      <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded">
                        <h3 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">Top Expense Categories</h3>
                        <div className="space-y-1">
                          {topCategories.slice(0, 3).map(([category, amount]) => (
                            <p key={category} className="text-sm text-orange-700 dark:text-orange-300">
                              • {category}: KSh {(amount as number).toLocaleString()}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="card-expense-trends">
                  <CardHeader>
                    <CardTitle>Expense Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {monthlyExpenseTrends.length > 0 ? (
                      <ResponsiveContainer width="100%" height={320}>
                        <AreaChart data={monthlyExpenseTrends}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="month" 
                            tick={{ fontSize: 11 }}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis 
                            tick={{ fontSize: 11 }}
                            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                          />
                          <Tooltip 
                            formatter={(value: number) => [`KSh ${value.toLocaleString()}`, 'Expenses']}
                            labelStyle={{ color: '#000' }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="amount" 
                            stroke="#ef4444" 
                            fill="#fca5a5" 
                            name="Monthly Expenses"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-80 bg-muted/20 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-sm text-muted-foreground">No expense data available</p>
                          <p className="text-xs text-muted-foreground mt-2">Add expenses to see monthly trends</p>
                        </div>
                      </div>
                    )}
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
