import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Egg, TrendingUp, AlertCircle, Plus, Menu, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertSaleSchema } from "@shared/schema";
import { z } from "zod";

const saleFormSchema = insertSaleSchema.extend({
  saleDate: z.string().min(1, "Sale date is required"),
  totalAmount: z.string().min(1, "Total amount is required"),
});

type SaleFormData = z.infer<typeof saleFormSchema>;

export default function EggProduction() {
  const { toast } = useToast();
  const { isLoading, isAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [saleDialogOpen, setSaleDialogOpen] = useState(false);
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

  const { data: dailyRecords, error: recordsError } = useQuery({
    queryKey: ["/api/daily-records"],
    enabled: isAuthenticated,
  });

  const { data: sales, error: salesError } = useQuery({
    queryKey: ["/api/sales"],
    enabled: isAuthenticated,
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

  const saleForm = useForm<SaleFormData>({
    resolver: zodResolver(saleFormSchema),
    defaultValues: {
      saleDate: new Date().toISOString().split('T')[0],
      customerName: "",
      cratesSold: 0,
      pricePerCrate: "",
      totalAmount: "",
      paymentStatus: "pending",
      notes: "",
    },
  });

  const createSaleMutation = useMutation({
    mutationFn: async (data: SaleFormData) => {
      const saleData = {
        ...data,
        cratesSold: Number(data.cratesSold),
        pricePerCrate: data.pricePerCrate,
        totalAmount: data.totalAmount,
      };
      await apiRequest("POST", "/api/sales", saleData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      toast({
        title: "Success",
        description: "Sale recorded successfully",
      });
      saleForm.reset();
      setSaleDialogOpen(false);
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
        description: error.message || "Failed to record sale",
        variant: "destructive",
      });
    },
  });

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

  const eggRecords = dailyRecords?.filter((record: any) => record.eggsCollected > 0) || [];
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

  const recentSales = sales?.slice(0, 5) || [];
  const weekSales = sales?.filter((sale: any) => {
    const saleDate = new Date(sale.saleDate);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return saleDate >= weekAgo;
  }) || [];
  const weekRevenue = weekSales.reduce((sum: number, sale: any) => sum + parseFloat(sale.totalAmount || '0'), 0);

  const onSubmitSale = (data: SaleFormData) => {
    createSaleMutation.mutate(data);
  };

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
                </DialogHeader>
                <Form {...saleForm}>
                  <form onSubmit={saleForm.handleSubmit(onSubmitSale)} className="space-y-4">
                    <FormField
                      control={saleForm.control}
                      name="saleDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sale Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-sale-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={saleForm.control}
                      name="customerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Customer Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter customer name" data-testid="input-customer-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={saleForm.control}
                        name="cratesSold"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Crates Sold</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field} 
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                data-testid="input-crates-sold"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={saleForm.control}
                        name="pricePerCrate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price per Crate</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01" 
                                {...field} 
                                placeholder="550.00"
                                data-testid="input-price-per-crate"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={saleForm.control}
                      name="totalAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Amount</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              {...field} 
                              placeholder="Auto-calculated"
                              data-testid="input-total-amount"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={saleForm.control}
                      name="paymentStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-payment-status">
                                <SelectValue placeholder="Select payment status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="paid">Paid</SelectItem>
                              <SelectItem value="overdue">Overdue</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={createSaleMutation.isPending}
                      data-testid="button-submit-sale"
                    >
                      {createSaleMutation.isPending ? "Recording..." : "Record Sale"}
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
                    <div className="h-80 bg-muted/20 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-sm text-muted-foreground">Production trend analysis</p>
                        <p className="text-xs text-muted-foreground mt-2">Chart showing daily production over time</p>
                      </div>
                    </div>
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
