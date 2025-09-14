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
import { Wheat, TrendingDown, AlertTriangle, Plus, Menu, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertFeedInventorySchema } from "@shared/schema";
import { z } from "zod";
import { Textarea } from "@/components/ui/textarea";

const feedFormSchema = z.object({
  feedType: z.string().min(1, "Feed type is required"),
  supplier: z.string().optional(),
  quantityKg: z.string().min(1, "Quantity is required"),
  unitPrice: z.string().optional(),
  purchaseDate: z.string().min(1, "Purchase date is required"),
  expiryDate: z.string().optional(),
});

type FeedFormData = z.infer<typeof feedFormSchema>;

export default function FeedManagement() {
  const { toast } = useToast();
  const { isLoading, isAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [feedDialogOpen, setFeedDialogOpen] = useState(false);
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

  const { data: feedInventory, error: inventoryError } = useQuery({
    queryKey: ["/api/feed-inventory"],
    enabled: isAuthenticated,
  });

  const { data: dailyRecords, error: recordsError } = useQuery({
    queryKey: ["/api/daily-records"],
    enabled: isAuthenticated,
  });

  // Handle unauthorized errors
  useEffect(() => {
    if ((inventoryError && isUnauthorizedError(inventoryError)) || (recordsError && isUnauthorizedError(recordsError))) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [inventoryError, recordsError, toast]);

  const feedForm = useForm<FeedFormData>({
    resolver: zodResolver(feedFormSchema),
    defaultValues: {
      feedType: "",
      supplier: "",
      quantityKg: "",
      unitPrice: "",
      purchaseDate: new Date().toISOString().split('T')[0],
      expiryDate: "",
    },
  });

  const createFeedMutation = useMutation({
    mutationFn: async (data: FeedFormData) => {
      const feedData = {
        ...data,
        quantityKg: data.quantityKg ? Number(data.quantityKg) : undefined,
        unitPrice: data.unitPrice ? Number(data.unitPrice) : undefined,
      };
      await apiRequest("POST", "/api/feed-inventory", feedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feed-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      toast({
        title: "Success",
        description: "Feed inventory added successfully",
      });
      feedForm.reset();
      setFeedDialogOpen(false);
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
        description: error.message || "Failed to add feed inventory",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading feed management data...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const feedRecords = dailyRecords?.filter((record: any) => record.feedConsumed && parseFloat(record.feedConsumed) > 0) || [];
  const totalStock = feedInventory?.reduce((sum: number, feed: any) => sum + parseFloat(feed.quantityKg || '0'), 0) || 0;
  const lowStockItems = feedInventory?.filter((feed: any) => parseFloat(feed.quantityKg || '0') < 500) || [];
  const expiringSoon = feedInventory?.filter((feed: any) => {
    if (!feed.expiryDate) return false;
    const expiryDate = new Date(feed.expiryDate);
    const monthFromNow = new Date();
    monthFromNow.setMonth(monthFromNow.getMonth() + 1);
    return expiryDate <= monthFromNow;
  }) || [];

  // Calculate daily consumption average
  const weekRecords = feedRecords.filter((record: any) => {
    const recordDate = new Date(record.recordDate);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return recordDate >= weekAgo;
  });
  const weekConsumption = weekRecords.reduce((sum: number, record: any) => sum + parseFloat(record.feedConsumed || '0'), 0);
  const dailyAverage = weekConsumption / 7;
  const daysRemaining = dailyAverage > 0 ? Math.floor(totalStock / dailyAverage) : 0;

  const onSubmitFeed = (data: FeedFormData) => {
    console.log("Feed form submitted with data:", data);
    console.log("Feed form errors:", feedForm.formState.errors);
    createFeedMutation.mutate(data);
  };

  const getStockStatus = (quantity: number) => {
    if (quantity < 200) return { status: "Critical", variant: "destructive" as const };
    if (quantity < 500) return { status: "Low", variant: "secondary" as const };
    return { status: "Good", variant: "default" as const };
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
                <h2 className="text-xl font-semibold text-foreground">Feed Management</h2>
                <p className="text-sm text-muted-foreground">Manage feed inventory and consumption tracking</p>
              </div>
            </div>
            
            <Dialog open={feedDialogOpen} onOpenChange={setFeedDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-feed">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Feed
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Feed Inventory</DialogTitle>
                </DialogHeader>
                <Form {...feedForm}>
                  <form onSubmit={feedForm.handleSubmit(onSubmitFeed)} className="space-y-4">
                    <FormField
                      control={feedForm.control}
                      name="feedType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Feed Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-feed-type">
                                <SelectValue placeholder="Select feed type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="layer-mash">Layer Mash</SelectItem>
                              <SelectItem value="layer-pellets">Layer Pellets</SelectItem>
                              <SelectItem value="chick-starter">Chick Starter</SelectItem>
                              <SelectItem value="broiler-starter">Broiler Starter</SelectItem>
                              <SelectItem value="grower-mash">Grower Mash</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={feedForm.control}
                      name="supplier"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Supplier</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter supplier name" data-testid="input-supplier" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={feedForm.control}
                        name="quantityKg"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quantity (kg)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01" 
                                {...field} 
                                placeholder="1000"
                                data-testid="input-quantity"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={feedForm.control}
                        name="unitPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unit Price (KSh/kg)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01" 
                                {...field} 
                                placeholder="45.00"
                                data-testid="input-unit-price"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={feedForm.control}
                        name="purchaseDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Purchase Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} data-testid="input-purchase-date" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={feedForm.control}
                        name="expiryDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Expiry Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} data-testid="input-expiry-date" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={createFeedMutation.isPending}
                      data-testid="button-submit-feed"
                    >
                      {createFeedMutation.isPending ? "Adding..." : "Add Feed"}
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
            <Card data-testid="card-total-stock">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Stock</p>
                    <p className="text-2xl font-bold text-foreground">{(totalStock / 1000).toFixed(1)} tons</p>
                    <p className="text-xs text-muted-foreground">{totalStock.toLocaleString()} kg</p>
                  </div>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Wheat className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-daily-consumption">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Daily Average</p>
                    <p className="text-2xl font-bold text-foreground">{Math.round(dailyAverage)} kg</p>
                    <p className="text-xs text-muted-foreground">Consumption</p>
                  </div>
                  <div className="w-12 h-12 bg-chart-2/10 rounded-lg flex items-center justify-center">
                    <TrendingDown className="h-6 w-6 text-chart-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-days-remaining">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Days Remaining</p>
                    <p className="text-2xl font-bold text-foreground">{daysRemaining}</p>
                    <p className={`text-xs ${daysRemaining < 7 ? 'text-red-600' : daysRemaining < 14 ? 'text-orange-600' : 'text-green-600'}`}>
                      {daysRemaining < 7 ? '⚠ Critical' : daysRemaining < 14 ? '⚠ Low' : '✓ Good'}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-low-stock-alerts">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Low Stock Items</p>
                    <p className="text-2xl font-bold text-foreground">{lowStockItems.length}</p>
                    <p className="text-xs text-red-600">Need attention</p>
                  </div>
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <Package className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alerts */}
          {(lowStockItems.length > 0 || expiringSoon.length > 0) && (
            <Card data-testid="card-feed-alerts">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <span>Feed Alerts</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {lowStockItems.map((feed: any) => (
                    <div key={feed.id} className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                      <div>
                        <p className="font-medium text-foreground">{feed.feedType} - Low Stock</p>
                        <p className="text-sm text-muted-foreground">Only {parseFloat(feed.quantityKg).toLocaleString()} kg remaining</p>
                      </div>
                      <Badge variant="secondary">Low</Badge>
                    </div>
                  ))}
                  {expiringSoon.map((feed: any) => (
                    <div key={`exp-${feed.id}`} className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <div>
                        <p className="font-medium text-foreground">{feed.feedType} - Expiring Soon</p>
                        <p className="text-sm text-muted-foreground">Expires: {new Date(feed.expiryDate).toLocaleDateString()}</p>
                      </div>
                      <Badge variant="secondary">Expiring</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="inventory" className="space-y-4">
            <TabsList>
              <TabsTrigger value="inventory">Current Inventory</TabsTrigger>
              <TabsTrigger value="consumption">Consumption Records</TabsTrigger>
              <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
            </TabsList>

            <TabsContent value="inventory">
              <Card data-testid="card-feed-inventory">
                <CardHeader>
                  <CardTitle>Feed Inventory</CardTitle>
                </CardHeader>
                <CardContent>
                  {!feedInventory || feedInventory.length === 0 ? (
                    <div className="text-center py-8">
                      <Wheat className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No feed inventory found</p>
                      <p className="text-sm text-muted-foreground mt-2">Add feed inventory to start tracking</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left p-2 font-medium text-muted-foreground">Feed Type</th>
                            <th className="text-left p-2 font-medium text-muted-foreground">Supplier</th>
                            <th className="text-left p-2 font-medium text-muted-foreground">Stock (kg)</th>
                            <th className="text-left p-2 font-medium text-muted-foreground">Unit Price</th>
                            <th className="text-left p-2 font-medium text-muted-foreground">Purchase Date</th>
                            <th className="text-left p-2 font-medium text-muted-foreground">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {feedInventory.map((feed: any) => {
                            const quantity = parseFloat(feed.quantityKg || '0');
                            const stockStatus = getStockStatus(quantity);
                            
                            return (
                              <tr key={feed.id} className="border-b border-border/50" data-testid={`row-feed-${feed.id}`}>
                                <td className="p-2 font-medium">{feed.feedType}</td>
                                <td className="p-2">{feed.supplier || "-"}</td>
                                <td className="p-2">{quantity.toLocaleString()}</td>
                                <td className="p-2">KSh {parseFloat(feed.unitPrice || '0').toLocaleString()}</td>
                                <td className="p-2">{feed.purchaseDate ? new Date(feed.purchaseDate).toLocaleDateString() : "-"}</td>
                                <td className="p-2">
                                  <Badge variant={stockStatus.variant}>
                                    {stockStatus.status}
                                  </Badge>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="consumption">
              <Card data-testid="card-consumption-records">
                <CardHeader>
                  <CardTitle>Feed Consumption Records</CardTitle>
                </CardHeader>
                <CardContent>
                  {feedRecords.length === 0 ? (
                    <div className="text-center py-8">
                      <TrendingDown className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No consumption records found</p>
                      <p className="text-sm text-muted-foreground mt-2">Start recording daily feed consumption</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left p-2 font-medium text-muted-foreground">Date</th>
                            <th className="text-left p-2 font-medium text-muted-foreground">Feed Type</th>
                            <th className="text-left p-2 font-medium text-muted-foreground">Consumed (kg)</th>
                            <th className="text-left p-2 font-medium text-muted-foreground">Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {feedRecords.slice(0, 10).map((record: any) => (
                            <tr key={record.id} className="border-b border-border/50" data-testid={`row-consumption-${record.id}`}>
                              <td className="p-2">{new Date(record.recordDate).toLocaleDateString()}</td>
                              <td className="p-2">{record.feedType || "-"}</td>
                              <td className="p-2 font-medium">{parseFloat(record.feedConsumed).toLocaleString()}</td>
                              <td className="p-2 max-w-xs truncate">{record.notes || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="suppliers">
              <Card data-testid="card-suppliers">
                <CardHeader>
                  <CardTitle>Feed Suppliers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* This would normally come from a suppliers API endpoint */}
                    <div className="text-center py-8">
                      <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Supplier management coming soon</p>
                      <p className="text-sm text-muted-foreground mt-2">Track supplier information and performance</p>
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
