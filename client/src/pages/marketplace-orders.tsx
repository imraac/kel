import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Search, Eye, Truck, Clock, CheckCircle, XCircle, Filter, Menu, MapPin, User as UserIcon, Calendar as CalendarIcon, Package, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertOrderSchema, insertDeliverySchema, type Order, type Customer, type Product, type Delivery, type User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { format } from "date-fns";

// COMPLETELY NEW ORDER FORM SCHEMAS
// Create order schema with proper validation and defensive coercion
const createOrderSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  requiredDate: z.string().min(1, "Required date is required"),
  deliveryMethod: z.enum(["pickup", "delivery"], {
    required_error: "Delivery method is required"
  }),
  deliveryAddress: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().min(1, "Product is required"),
    quantity: z.coerce.number().int().positive("Quantity must be a positive number")
  })).min(1, "At least one item is required"),
});

// Edit order schema - only fields that can be updated
const editOrderSchema = z.object({
  status: z.enum(["pending", "confirmed", "processing", "ready", "delivered", "cancelled"], {
    required_error: "Status is required"
  }),
  paymentStatus: z.enum(["pending", "partial", "paid", "refunded"], {
    required_error: "Payment status is required"
  }),
  paidAmount: z.coerce.number().nonnegative(),
  deliveryMethod: z.enum(["pickup", "delivery"]),
  deliveryAddress: z.string().optional(),
  notes: z.string().optional(),
});

// Delivery form schemas
const deliveryFormSchema = insertDeliverySchema.extend({
  orderId: z.string().min(1, "Order is required"),
  driverId: z.string().optional(),
  scheduledDate: z.string().min(1, "Scheduled date is required"),
});

const deliveryUpdateSchema = z.object({
  status: z.enum(["scheduled", "in_transit", "delivered", "failed"]),
  deliveryNotes: z.string().optional(),
  recipientName: z.string().optional(),
  recipientPhone: z.string().optional(),
  actualDate: z.string().optional(),
});

export default function MarketplaceOrders() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  // Removed old state - using new consolidated state above
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  // Removed - using new form-based item management
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDeliveryDialogOpen, setIsDeliveryDialogOpen] = useState(false);
  const [isDeliveryUpdateDialogOpen, setIsDeliveryUpdateDialogOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const { toast } = useToast();
  const { user, isLoading, isAuthenticated } = useAuth();

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

  const { data: orders = [], isLoading: ordersLoading, error: ordersError } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    enabled: isAuthenticated,
  });

  // Handle unauthorized errors
  useEffect(() => {
    if (ordersError && isUnauthorizedError(ordersError)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [ordersError, toast]);

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    enabled: isAuthenticated,
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    enabled: isAuthenticated,
  });

  // Query for all deliveries
  const { data: deliveries = [] } = useQuery<Delivery[]>({
    queryKey: ["/api/deliveries"],
    enabled: isAuthenticated,
  });

  // Query for users (for driver assignment)
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isAuthenticated && user?.role === 'admin',
  });

  // Dummy driver data for testing
  const dummyDrivers = [
    { id: "driver-1", firstName: "John", lastName: "Doe", role: "staff" },
    { id: "driver-2", firstName: "Jane", lastName: "Smith", role: "admin" },
    { id: "driver-3", firstName: "Mike", lastName: "Johnson", role: "staff" },
    { id: "driver-4", firstName: "Sarah", lastName: "Wilson", role: "staff" },
    { id: "driver-5", firstName: "David", lastName: "Brown", role: "admin" },
  ];

  // Combine real users with dummy drivers
  const availableDrivers = [...users.filter((u: User) => u.role === 'admin' || u.role === 'staff'), ...dummyDrivers];

  // NEW CREATE MUTATION WITH PROPER LOGGING
  const createOrderMutation = useMutation({
    mutationFn: (data: any) => {
      console.log('Sending order data to API:', data);
      return apiRequest("POST", "/api/orders", data);
    },
    onSuccess: (response) => {
      console.log('Order creation successful:', response);
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setIsFormDialogOpen(false);
      createForm.reset();
      toast({
        title: "Success",
        description: "Order created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create order",
        variant: "destructive",
      });
    },
  });

  // Delivery mutations
  const createDeliveryMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/deliveries", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setIsDeliveryDialogOpen(false);
      toast({
        title: "Success",
        description: "Delivery scheduled successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to schedule delivery",
        variant: "destructive",
      });
    },
  });

  const updateDeliveryMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & any) => 
      apiRequest("PATCH", `/api/deliveries/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setIsDeliveryUpdateDialogOpen(false);
      toast({
        title: "Success",
        description: "Delivery updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update delivery",
        variant: "destructive",
      });
    },
  });

  // COMPLETELY NEW STATE MANAGEMENT
  // Create/Edit mode state
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);

  // Create form
  const createForm = useForm<z.infer<typeof createOrderSchema>>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      customerId: "",
      requiredDate: "",
      deliveryMethod: "pickup",
      deliveryAddress: "",
      notes: "",
      items: [{ productId: "", quantity: 1 }],
    },
  });

  // Edit form
  const editForm = useForm<z.infer<typeof editOrderSchema>>({
    resolver: zodResolver(editOrderSchema),
    defaultValues: {
      status: "pending",
      paymentStatus: "pending",
      paidAmount: 0,
      deliveryMethod: "pickup",
      deliveryAddress: "",
      notes: "",
    },
  });

  // Delivery forms
  const deliveryForm = useForm<z.infer<typeof deliveryFormSchema>>({
    resolver: zodResolver(deliveryFormSchema),
    defaultValues: {
      orderId: "",
      driverId: "",
      vehicleInfo: "",
      scheduledDate: "",
      deliveryNotes: "",
      recipientName: "",
      recipientPhone: "",
    },
  });

  const deliveryUpdateForm = useForm<z.infer<typeof deliveryUpdateSchema>>({
    resolver: zodResolver(deliveryUpdateSchema),
    defaultValues: {
      status: "scheduled",
      deliveryNotes: "",
      recipientName: "",
      recipientPhone: "",
      actualDate: "",
    },
  });

  // Removed old duplicate editForm - using new one above

  // NEW MUTATION WITH PROPER TYPE HANDLING
  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: z.infer<typeof editOrderSchema> }) => {
      await apiRequest("PATCH", `/api/orders/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Success",
        description: "Order updated successfully",
      });
      editForm.reset();
      setIsFormDialogOpen(false);
      setEditingOrder(null);
      setMode("create");
    },
    onError: (error: any) => {
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
        description: error.message || "Failed to update order",
        variant: "destructive",
      });
    },
  });

  // Removed old onSubmitEdit - using new onEditSubmit above

  // NEW MODE HANDLERS
  const handleCreateOrder = () => {
    setMode("create");
    createForm.reset();
    setIsFormDialogOpen(true);
  };

  const handleEditOrder = (order: Order) => {
    setMode("edit");
    setEditingOrder(order);
    editForm.reset({
      status: order.status as any,
      paymentStatus: order.paymentStatus as any,
      paidAmount: Number(order.paidAmount) || 0,
      deliveryMethod: order.deliveryMethod as any,
      deliveryAddress: order.deliveryAddress || undefined,
      notes: order.notes || undefined,
    });
    setIsFormDialogOpen(true);
  };

  const filteredOrders = orders.filter((order: Order) => {
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.notes && order.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // NEW SUBMISSION HANDLERS WITH DEFENSIVE COERCION
  const onCreateSubmit = (data: z.infer<typeof createOrderSchema>) => {
    // Defensive coercion and validation
    const orderData = {
      customerId: data.customerId,
      requiredDate: data.requiredDate,
      deliveryMethod: data.deliveryMethod,
      deliveryAddress: data.deliveryAddress || undefined,
      notes: data.notes || undefined,
      items: data.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity // Already transformed to number by schema
      }))
    };
    
    console.log('Creating order with data:', orderData);
    createOrderMutation.mutate(orderData);
  };

  const onEditSubmit = (data: z.infer<typeof editOrderSchema>) => {
    if (!editingOrder) return;
    
    // Defensive coercion for edit data
    const updateData = {
      status: data.status,
      paymentStatus: data.paymentStatus,
      paidAmount: data.paidAmount, // Already transformed by schema
      deliveryMethod: data.deliveryMethod,
      deliveryAddress: data.deliveryAddress || undefined,
      notes: data.notes || undefined,
    };
    
    console.log('Updating order with data:', updateData);
    updateOrderMutation.mutate({ id: editingOrder.id, data: updateData });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "confirmed": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "processing": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
      case "ready": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "delivered": return "bg-green-600 text-white";
      case "cancelled": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="h-4 w-4" />;
      case "confirmed": return <CheckCircle className="h-4 w-4" />;
      case "processing": return <Clock className="h-4 w-4" />;
      case "ready": return <CheckCircle className="h-4 w-4" />;
      case "delivered": return <Truck className="h-4 w-4" />;
      case "cancelled": return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  // Form-controlled order items management for create mode only
  const watchedItems = createForm.watch("items");

  // NEW ITEM MANAGEMENT FOR CREATE FORM
  const addOrderItem = () => {
    const currentItems = createForm.getValues("items");
    createForm.setValue("items", [...currentItems, { productId: "", quantity: 1 }]);
  };

  const removeOrderItem = (index: number) => {
    const currentItems = createForm.getValues("items");
    if (currentItems.length > 1) {
      createForm.setValue("items", currentItems.filter((_: any, i: number) => i !== index));
    }
  };

  const updateOrderItem = (index: number, field: string, value: any) => {
    const currentItems = createForm.getValues("items");
    const updated = [...currentItems];
    updated[index] = { ...updated[index], [field]: value };
    createForm.setValue("items", updated);
  };

  const getCustomerName = (customerId: string) => {
    const customer = customers.find((c: Customer) => c.id === customerId);
    return customer ? customer.name : "Unknown";
  };

  const getTotalAmount = (order: Order) => {
    return parseFloat(order.totalAmount).toLocaleString();
  };

  // Delivery helper functions
  const getDeliveryForOrder = (orderId: string) => {
    return deliveries.find((d: Delivery) => d.orderId === orderId);
  };

  const getDeliveryStatusColor = (status: string) => {
    switch (status) {
      case "scheduled": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "in_transit": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
      case "delivered": return "bg-green-600 text-white";
      case "failed": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getDeliveryStatusIcon = (status: string) => {
    switch (status) {
      case "scheduled": return <Calendar className="h-4 w-4" />;
      case "in_transit": return <Truck className="h-4 w-4" />;
      case "delivered": return <CheckCircle className="h-4 w-4" />;
      case "failed": return <AlertCircle className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const getDriverName = (driverId: string | null) => {
    if (!driverId) return "Not assigned";
    const driver = users.find((u: User) => u.id === driverId);
    return driver ? `${driver.firstName} ${driver.lastName}` : "Unknown";
  };

  // Form submission handlers
  const onDeliverySubmit = (data: z.infer<typeof deliveryFormSchema>) => {
    const deliveryData = {
      ...data,
      scheduledDate: new Date(data.scheduledDate).toISOString(),
    };
    createDeliveryMutation.mutate(deliveryData);
  };

  const onDeliveryUpdateSubmit = (data: z.infer<typeof deliveryUpdateSchema>) => {
    if (!selectedDelivery) return;
    const updateData = {
      id: selectedDelivery.id,
      ...data,
      actualDate: data.actualDate ? new Date(data.actualDate).toISOString() : undefined,
    };
    updateDeliveryMutation.mutate(updateData);
  };

  const openDeliveryDialog = (order: Order) => {
    deliveryForm.reset({
      orderId: order.id,
      driverId: "",
      vehicleInfo: "",
      scheduledDate: "",
      deliveryNotes: "",
      recipientName: "",
      recipientPhone: "",
    });
    setSelectedOrder(order);
    setIsDeliveryDialogOpen(true);
  };

  const openDeliveryUpdateDialog = (delivery: Delivery) => {
    deliveryUpdateForm.reset({
      status: delivery.status as "scheduled" | "in_transit" | "delivered" | "failed",
      deliveryNotes: delivery.deliveryNotes || "",
      recipientName: delivery.recipientName || "",
      recipientPhone: delivery.recipientPhone || "",
      actualDate: delivery.actualDate ? new Date(delivery.actualDate).toISOString().split('T')[0] : "",
    });
    setSelectedDelivery(delivery);
    setIsDeliveryUpdateDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading orders...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

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
                <h2 className="text-xl font-semibold text-foreground">Order Management</h2>
                <p className="text-sm text-muted-foreground">Manage customer orders and deliveries</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Order Management</h1>
            <p className="text-muted-foreground">Manage customer orders and deliveries</p>
          </div>
          
          <Button onClick={handleCreateOrder} data-testid="button-create-order">
            <Plus className="mr-2 h-4 w-4" />
            Create Order
          </Button>
        </div>  {/* Close the toolbar div from line 561 */}

        {/* NEW UNIFIED CREATE/EDIT DIALOG */}
        <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {mode === "create" ? "Create New Order" : "Edit Order"}
              </DialogTitle>
            </DialogHeader>
            {mode === "create" ? (
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(onCreateSubmit, (errors) => {
                  console.error('Create form validation errors:', errors);
                  toast({
                    title: "Form Validation Error",
                    description: "Please check all required fields",
                    variant: "destructive"
                  });
                })} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={createForm.control}
                      name="customerId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Customer</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-order-customer">
                                <SelectValue placeholder="Select customer" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {customers.map((customer: Customer) => (
                                <SelectItem key={customer.id} value={customer.id}>
                                  {customer.name} - {customer.phone}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="requiredDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Required Date</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" data-testid="input-order-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={createForm.control}
                      name="deliveryMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Delivery Method</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-delivery-method">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="pickup">Customer Pickup</SelectItem>
                              <SelectItem value="delivery">Home Delivery</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {createForm.watch("deliveryMethod") === "delivery" && (
                      <FormField
                        control={createForm.control}
                        name="deliveryAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Delivery Address</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ''} onChange={(e) => field.onChange(e.target.value || null)} data-testid="input-delivery-address" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  {/* Order Items */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Order Items</h3>
                      <Button type="button" variant="outline" onClick={addOrderItem} data-testid="button-add-item">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Item
                      </Button>
                    </div>
                    
                    {watchedItems.map((item: any, index: number) => (
                      <div key={index} className="flex items-end space-x-4 p-4 border rounded-lg">
                        <div className="flex-1">
                          <label className="text-sm font-medium">Product</label>
                          <Select
                            value={item.productId}
                            onValueChange={(value) => updateOrderItem(index, "productId", value)}
                          >
                            <SelectTrigger data-testid={`select-item-product-${index}`}>
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                              {products.filter((p: Product) => p.isAvailable).map((product: Product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name} - KES {parseFloat(product.currentPrice).toLocaleString()} per {product.unit}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="w-24">
                          <label className="text-sm font-medium">Quantity</label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateOrderItem(index, "quantity", parseInt(e.target.value) || 1)}
                            data-testid={`input-item-quantity-${index}`}
                          />
                        </div>
                        
                        {watchedItems.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeOrderItem(index)}
                            data-testid={`button-remove-item-${index}`}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  <FormField
                    control={createForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea {...field} value={field.value || ''} onChange={(e) => field.onChange(e.target.value || undefined)} rows={2} data-testid="input-order-notes" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsFormDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createOrderMutation.isPending} data-testid="button-save-order">
                      {createOrderMutation.isPending ? "Creating..." : "Create Order"}
                    </Button>
                  </div>
                </form>
              </Form>
            ) : (
              // EDIT FORM
              <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Order Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-edit-order-status">
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="confirmed">Confirmed</SelectItem>
                              <SelectItem value="processing">Processing</SelectItem>
                              <SelectItem value="ready">Ready</SelectItem>
                              <SelectItem value="delivered">Delivered</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="paymentStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-edit-payment-status">
                                <SelectValue placeholder="Select payment status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="partial">Partial</SelectItem>
                              <SelectItem value="paid">Paid</SelectItem>
                              <SelectItem value="refunded">Refunded</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={editForm.control}
                    name="paidAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Paid Amount (KES)</FormLabel>
                        <FormControl>
                          <Input {...field} type="text" placeholder="0.00" data-testid="input-edit-paid-amount" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="deliveryMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Delivery Method</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-delivery-method">
                              <SelectValue placeholder="Select method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="pickup">Pickup</SelectItem>
                            <SelectItem value="delivery">Delivery</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {editForm.watch("deliveryMethod") === "delivery" && (
                    <FormField
                      control={editForm.control}
                      name="deliveryAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Delivery Address</FormLabel>
                          <FormControl>
                            <Textarea {...field} value={field.value || ''} onChange={(e) => field.onChange(e.target.value || undefined)} rows={2} data-testid="input-edit-delivery-address" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={editForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea {...field} value={field.value || ''} onChange={(e) => field.onChange(e.target.value || undefined)} rows={3} data-testid="input-edit-order-notes" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsFormDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={updateOrderMutation.isPending} data-testid="button-update-order">
                      {updateOrderMutation.isPending ? "Updating..." : "Update Order"}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </DialogContent>
        </Dialog>

        {/* Filters */}

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders by order number or notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                  data-testid="input-search-orders"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-filter-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        <div className="grid gap-4">
          {ordersLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">Loading orders...</p>
              </CardContent>
            </Card>
          ) : filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <p className="text-muted-foreground mb-2">
                    {searchTerm || statusFilter !== "all" ? "No orders found matching your criteria" : "No orders yet"}
                  </p>
                  {!searchTerm && statusFilter === "all" && (
                    <Button onClick={() => setIsFormDialogOpen(true)} data-testid="button-create-first-order">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Your First Order
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredOrders.map((order: Order) => (
              <Card key={order.id} data-testid={`card-order-${order.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{order.orderNumber}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Customer: {getCustomerName(order.customerId)}
                      </p>
                    </div>
                    <Badge className={getStatusColor(order.status)}>
                      <span className="flex items-center space-x-1">
                        {getStatusIcon(order.status)}
                        <span>{order.status}</span>
                      </span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Order Date</p>
                      <p className="text-sm font-medium">
                        {order.orderDate ? new Date(order.orderDate).toLocaleDateString() : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Required Date</p>
                      <p className="text-sm font-medium">
                        {order.requiredDate ? new Date(order.requiredDate).toLocaleDateString() : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Delivery Method</p>
                      <p className="text-sm font-medium capitalize">{order.deliveryMethod}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Amount</p>
                      <p className="text-sm font-medium">KES {getTotalAmount(order)}</p>
                    </div>
                  </div>

                  {order.deliveryAddress && (
                    <div className="mb-4">
                      <p className="text-sm text-muted-foreground">Delivery Address</p>
                      <p className="text-sm">{order.deliveryAddress}</p>
                    </div>
                  )}

                  {order.notes && (
                    <div className="mb-4">
                      <p className="text-sm text-muted-foreground">Notes</p>
                      <p className="text-sm">{order.notes}</p>
                    </div>
                  )}

                  {/* Delivery Tracking Section */}
                  {order.deliveryMethod === "delivery" && (() => {
                    const delivery = getDeliveryForOrder(order.id);
                    return (
                      <div className="mb-4 p-3 bg-muted/30 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium flex items-center">
                            <Truck className="mr-2 h-4 w-4" />
                            Delivery Tracking
                          </h4>
                          {delivery && (
                            <Badge className={getDeliveryStatusColor(delivery.status)}>
                              <span className="flex items-center space-x-1">
                                {getDeliveryStatusIcon(delivery.status)}
                                <span className="capitalize">{delivery.status.replace('_', ' ')}</span>
                              </span>
                            </Badge>
                          )}
                        </div>
                        
                        {delivery ? (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                            <div>
                              <p className="text-muted-foreground">Driver</p>
                              <p className="font-medium flex items-center">
                                <UserIcon className="mr-1 h-3 w-3" />
                                {getDriverName(delivery.driverId)}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Scheduled Date</p>
                              <p className="font-medium">
                                {delivery.scheduledDate ? new Date(delivery.scheduledDate).toLocaleDateString() : 'Not scheduled'}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Vehicle</p>
                              <p className="font-medium">{delivery.vehicleInfo || 'Not specified'}</p>
                            </div>
                            {delivery.actualDate && (
                              <div>
                                <p className="text-muted-foreground">Delivered Date</p>
                                <p className="font-medium text-green-600">
                                  {new Date(delivery.actualDate).toLocaleDateString()}
                                </p>
                              </div>
                            )}
                            {delivery.deliveryNotes && (
                              <div className="md:col-span-2">
                                <p className="text-muted-foreground">Delivery Notes</p>
                                <p className="font-medium">{delivery.deliveryNotes}</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            <MapPin className="inline mr-1 h-3 w-3" />
                            Delivery not scheduled yet
                          </p>
                        )}
                      </div>
                    );
                  })()}

                  <div className="flex justify-end space-x-2 flex-wrap gap-2">
                    <Button variant="outline" size="sm" data-testid={`button-view-order-${order.id}`}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </Button>
                    
                    {/* Delivery Management Buttons */}
                    {order.deliveryMethod === "delivery" && (() => {
                      const delivery = getDeliveryForOrder(order.id);
                      return delivery ? (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => openDeliveryUpdateDialog(delivery)}
                          data-testid={`button-update-delivery-${order.id}`}
                        >
                          <Truck className="mr-2 h-4 w-4" />
                          Update Delivery
                        </Button>
                      ) : (
                        order.status !== "cancelled" && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => openDeliveryDialog(order)}
                            data-testid={`button-schedule-delivery-${order.id}`}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            Schedule Delivery
                          </Button>
                        )
                      );
                    })()}
                    
                    {order.status !== "delivered" && order.status !== "cancelled" && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleEditOrder(order)}
                        data-testid={`button-update-order-${order.id}`}
                      >
                        Update Status
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Delivery Management Dialogs */}
        
        {/* Schedule Delivery Dialog */}
        <Dialog open={isDeliveryDialogOpen} onOpenChange={setIsDeliveryDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Schedule Delivery</DialogTitle>
            </DialogHeader>
            <Form {...deliveryForm}>
              <form onSubmit={deliveryForm.handleSubmit(onDeliverySubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={deliveryForm.control}
                    name="driverId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Driver (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-driver">
                              <SelectValue placeholder="Select driver" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="unassigned">No driver assigned</SelectItem>
                            {availableDrivers.map((driver) => (
                              <SelectItem key={driver.id} value={driver.id}>
                                {driver.firstName} {driver.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={deliveryForm.control}
                    name="scheduledDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Scheduled Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                              data-testid="button-scheduled-date"
                            >
                              {field.value ? (
                                format(new Date(field.value), "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value ? new Date(field.value) : undefined}
                              onSelect={(date) => {
                                field.onChange(date ? format(date, "yyyy-MM-dd") : "");
                              }}
                              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={deliveryForm.control}
                  name="vehicleInfo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle Information (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} onChange={(e) => field.onChange(e.target.value || null)} placeholder="e.g., Truck KCA 123A" data-testid="input-vehicle-info" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={deliveryForm.control}
                    name="recipientName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recipient Name (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} onChange={(e) => field.onChange(e.target.value || null)} data-testid="input-recipient-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={deliveryForm.control}
                    name="recipientPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recipient Phone (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} onChange={(e) => field.onChange(e.target.value || null)} placeholder="e.g., +254..." data-testid="input-recipient-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={deliveryForm.control}
                  name="deliveryNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value || ''} onChange={(e) => field.onChange(e.target.value || null)} rows={2} placeholder="Special instructions..." data-testid="input-delivery-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsDeliveryDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createDeliveryMutation.isPending} data-testid="button-save-delivery">
                    {createDeliveryMutation.isPending ? "Scheduling..." : "Schedule Delivery"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Update Delivery Status Dialog */}
        <Dialog open={isDeliveryUpdateDialogOpen} onOpenChange={setIsDeliveryUpdateDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Update Delivery Status</DialogTitle>
            </DialogHeader>
            <Form {...deliveryUpdateForm}>
              <form onSubmit={deliveryUpdateForm.handleSubmit(onDeliveryUpdateSubmit)} className="space-y-4">
                <FormField
                  control={deliveryUpdateForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-delivery-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                          <SelectItem value="in_transit">In Transit</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                          <SelectItem value="failed">Failed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {deliveryUpdateForm.watch("status") === "delivered" && (
                  <FormField
                    control={deliveryUpdateForm.control}
                    name="actualDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Delivery Date</FormLabel>
                        <FormControl>
                          <Input {...field} type="datetime-local" data-testid="input-actual-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={deliveryUpdateForm.control}
                    name="recipientName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recipient Name</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} onChange={(e) => field.onChange(e.target.value || null)} data-testid="input-update-recipient-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={deliveryUpdateForm.control}
                    name="recipientPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recipient Phone</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} onChange={(e) => field.onChange(e.target.value || null)} data-testid="input-update-recipient-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={deliveryUpdateForm.control}
                  name="deliveryNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value || ''} onChange={(e) => field.onChange(e.target.value || null)} rows={3} placeholder="Update notes, delivery status, issues..." data-testid="input-update-delivery-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsDeliveryUpdateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateDeliveryMutation.isPending} data-testid="button-update-delivery">
                    {updateDeliveryMutation.isPending ? "Updating..." : "Update Delivery"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Old duplicate order dialog removed - using unified create/edit dialog above */}

        </div>  {/* Close the content div from line 560 */}
      </main>
    </div>
  );
}