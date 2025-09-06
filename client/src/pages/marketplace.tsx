import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users, Calendar, Package, AlertCircle, CheckCircle, Clock, Phone, Mail, MapPin } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone: string;
  address?: string;
  businessType?: string;
  preferredContactMethod: string;
  isActive: boolean;
  createdAt: string;
}

interface Booking {
  id: string;
  customerId: string;
  bookingDate: string;
  deliveryDate: string;
  cratesRequested: number;
  pricePerCrate: number;
  totalAmount: number;
  deposit: number;
  status: string;
  priority: string;
  specialRequirements?: string;
  notes?: string;
}

interface DemandRequest {
  id: string;
  customerId: string;
  requestDate: string;
  urgencyLevel: string;
  cratesNeeded: number;
  maxPricePerCrate?: number;
  preferredDeliveryDate?: string;
  flexibleDelivery: boolean;
  description?: string;
  status: string;
  matchedBookingId?: string;
}

export default function Marketplace() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("overview");

  // Fetch data
  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ["/api/customers"],
  });

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["/api/bookings"],
  });

  const { data: demandRequests = [], isLoading: demandsLoading } = useQuery({
    queryKey: ["/api/demand-requests"],
  });

  const { data: openDemands = [] } = useQuery({
    queryKey: ["/api/demand-requests/open"],
  });

  // Mutations
  const createCustomerMutation = useMutation({
    mutationFn: async (customerData: any) => {
      await apiRequest("/api/customers", {
        method: "POST",
        body: customerData,
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Customer created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create customer", variant: "destructive" });
    },
  });

  const createBookingMutation = useMutation({
    mutationFn: async (bookingData: any) => {
      await apiRequest("/api/bookings", {
        method: "POST",
        body: bookingData,
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Booking created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create booking", variant: "destructive" });
    },
  });

  const updateBookingStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiRequest(`/api/bookings/${id}/status`, {
        method: "PUT",
        body: { status },
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Booking status updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update booking status", variant: "destructive" });
    },
  });

  // Stats calculations
  const stats = {
    totalCustomers: customers.length,
    activeBookings: bookings.filter((b: Booking) => ['pending', 'confirmed'].includes(b.status)).length,
    openDemands: openDemands.length,
    monthlyRevenue: bookings.filter((b: Booking) => b.status === 'fulfilled' && 
      new Date(b.deliveryDate).getMonth() === new Date().getMonth())
      .reduce((sum: number, b: Booking) => sum + parseFloat(b.totalAmount || '0'), 0),
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'confirmed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'fulfilled': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'open': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'matched': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'expired': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'normal': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'low': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Customer Marketplace</h2>
        <div className="flex items-center space-x-2">
          <CustomerDialog />
          <BookingDialog customers={customers} />
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="stat-total-customers">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCustomers}</div>
            <p className="text-xs text-muted-foreground">
              Registered customers
            </p>
          </CardContent>
        </Card>

        <Card data-testid="stat-active-bookings">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeBookings}</div>
            <p className="text-xs text-muted-foreground">
              Pending & confirmed orders
            </p>
          </CardContent>
        </Card>

        <Card data-testid="stat-open-demands">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Demands</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.openDemands}</div>
            <p className="text-xs text-muted-foreground">
              Customer requests waiting
            </p>
          </CardContent>
        </Card>

        <Card data-testid="stat-monthly-revenue">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KSh {stats.monthlyRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              From fulfilled orders
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList data-testid="marketplace-tabs">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="customers" data-testid="tab-customers">Customers</TabsTrigger>
          <TabsTrigger value="bookings" data-testid="tab-bookings">Bookings</TabsTrigger>
          <TabsTrigger value="demands" data-testid="tab-demands">Demand Requests</TabsTrigger>
          <TabsTrigger value="matching" data-testid="tab-matching">Smart Matching</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {bookings.slice(0, 5).map((booking: Booking) => (
                    <div key={booking.id} className="flex items-center space-x-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {customers.find((c: Customer) => c.id === booking.customerId)?.name || 'Unknown Customer'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {booking.cratesRequested} crates • {format(new Date(booking.deliveryDate), 'MMM dd')}
                        </p>
                      </div>
                      <Badge className={getStatusColor(booking.status)}>
                        {booking.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Open Demand Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {openDemands.slice(0, 5).map((demand: DemandRequest) => (
                    <div key={demand.id} className="flex items-center space-x-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {customers.find((c: Customer) => c.id === demand.customerId)?.name || 'Unknown Customer'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {demand.cratesNeeded} crates • {demand.urgencyLevel} priority
                        </p>
                      </div>
                      <Badge className={getStatusColor(demand.status)}>
                        {demand.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Directory</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {customersLoading ? (
                  <div>Loading customers...</div>
                ) : customers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No customers registered yet. Add your first customer to get started.
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {customers.map((customer: Customer) => (
                      <Card key={customer.id} data-testid={`customer-card-${customer.id}`}>
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold">{customer.name}</h4>
                              <Badge variant={customer.isActive ? "default" : "secondary"}>
                                {customer.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                            
                            <div className="space-y-1 text-sm text-muted-foreground">
                              {customer.phone && (
                                <div className="flex items-center space-x-2">
                                  <Phone className="h-3 w-3" />
                                  <span>{customer.phone}</span>
                                </div>
                              )}
                              {customer.email && (
                                <div className="flex items-center space-x-2">
                                  <Mail className="h-3 w-3" />
                                  <span>{customer.email}</span>
                                </div>
                              )}
                              {customer.address && (
                                <div className="flex items-center space-x-2">
                                  <MapPin className="h-3 w-3" />
                                  <span className="truncate">{customer.address}</span>
                                </div>
                              )}
                            </div>
                            
                            {customer.businessType && (
                              <Badge variant="outline" className="text-xs">
                                {customer.businessType}
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Advance Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {bookingsLoading ? (
                  <div>Loading bookings...</div>
                ) : bookings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No bookings yet. Create your first booking to start managing orders.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bookings.map((booking: Booking) => (
                      <Card key={booking.id} data-testid={`booking-card-${booking.id}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between space-x-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center space-x-2">
                                <h4 className="font-semibold">
                                  {customers.find((c: Customer) => c.id === booking.customerId)?.name || 'Unknown Customer'}
                                </h4>
                                <Badge className={getStatusColor(booking.status)}>
                                  {booking.status}
                                </Badge>
                                <Badge className={getPriorityColor(booking.priority)}>
                                  {booking.priority}
                                </Badge>
                              </div>
                              
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Crates:</span>
                                  <div className="font-medium">{booking.cratesRequested}</div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Price/Crate:</span>
                                  <div className="font-medium">KSh {booking.pricePerCrate}</div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Total:</span>
                                  <div className="font-medium">KSh {booking.totalAmount}</div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Delivery:</span>
                                  <div className="font-medium">{format(new Date(booking.deliveryDate), 'MMM dd, yyyy')}</div>
                                </div>
                              </div>
                              
                              {booking.specialRequirements && (
                                <div className="text-sm">
                                  <span className="text-muted-foreground">Special Requirements:</span>
                                  <div className="mt-1">{booking.specialRequirements}</div>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex flex-col space-y-2">
                              {booking.status === 'pending' && (
                                <Button
                                  size="sm"
                                  onClick={() => updateBookingStatusMutation.mutate({ id: booking.id, status: 'confirmed' })}
                                  data-testid={`button-confirm-booking-${booking.id}`}
                                >
                                  Confirm
                                </Button>
                              )}
                              {booking.status === 'confirmed' && (
                                <Button
                                  size="sm"
                                  onClick={() => updateBookingStatusMutation.mutate({ id: booking.id, status: 'fulfilled' })}
                                  data-testid={`button-fulfill-booking-${booking.id}`}
                                >
                                  Mark Fulfilled
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="demands" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Demand Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {demandsLoading ? (
                  <div>Loading demand requests...</div>
                ) : demandRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No demand requests yet. Customers can submit requests for eggs when they need them.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {demandRequests.map((demand: DemandRequest) => (
                      <Card key={demand.id} data-testid={`demand-card-${demand.id}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between space-x-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center space-x-2">
                                <h4 className="font-semibold">
                                  {customers.find((c: Customer) => c.id === demand.customerId)?.name || 'Unknown Customer'}
                                </h4>
                                <Badge className={getStatusColor(demand.status)}>
                                  {demand.status}
                                </Badge>
                                <Badge variant={demand.urgencyLevel === 'urgent' ? 'destructive' : 'outline'}>
                                  {demand.urgencyLevel}
                                </Badge>
                              </div>
                              
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Crates Needed:</span>
                                  <div className="font-medium">{demand.cratesNeeded}</div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Max Price:</span>
                                  <div className="font-medium">
                                    {demand.maxPricePerCrate ? `KSh ${demand.maxPricePerCrate}` : 'Not specified'}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Preferred Date:</span>
                                  <div className="font-medium">
                                    {demand.preferredDeliveryDate 
                                      ? format(new Date(demand.preferredDeliveryDate), 'MMM dd, yyyy')
                                      : 'Flexible'
                                    }
                                  </div>
                                </div>
                              </div>
                              
                              {demand.description && (
                                <div className="text-sm">
                                  <span className="text-muted-foreground">Description:</span>
                                  <div className="mt-1">{demand.description}</div>
                                </div>
                              )}
                              
                              <div className="text-xs text-muted-foreground">
                                Submitted on {format(new Date(demand.requestDate), 'MMM dd, yyyy')}
                              </div>
                            </div>
                            
                            <div className="flex flex-col space-y-2">
                              {demand.status === 'open' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  data-testid={`button-match-demand-${demand.id}`}
                                >
                                  Create Booking
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matching" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Smart Supply-Demand Matching</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <SmartMatchingPanel />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Customer Dialog Component
function CustomerDialog() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    businessType: "",
    preferredContactMethod: "phone",
    notes: "",
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (customerData: any) => {
      await apiRequest("/api/customers", {
        method: "POST",
        body: customerData,
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Customer created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setOpen(false);
      setFormData({
        name: "",
        email: "",
        phone: "",
        address: "",
        businessType: "",
        preferredContactMethod: "phone",
        notes: "",
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create customer", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      toast({ title: "Error", description: "Name and phone are required", variant: "destructive" });
      return;
    }
    createCustomerMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-customer">
          <Plus className="mr-2 h-4 w-4" />
          Add Customer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Customer name"
                required
                data-testid="input-customer-name"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+254 xxx xxx xxx"
                required
                data-testid="input-customer-phone"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="customer@example.com"
              data-testid="input-customer-email"
            />
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Customer address"
              data-testid="input-customer-address"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="businessType">Business Type</Label>
              <Select
                value={formData.businessType}
                onValueChange={(value) => setFormData({ ...formData, businessType: value })}
              >
                <SelectTrigger data-testid="select-business-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="retailer">Retailer</SelectItem>
                  <SelectItem value="restaurant">Restaurant</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="distributor">Distributor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="contactMethod">Preferred Contact</Label>
              <Select
                value={formData.preferredContactMethod}
                onValueChange={(value) => setFormData({ ...formData, preferredContactMethod: value })}
              >
                <SelectTrigger data-testid="select-contact-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes about the customer"
              data-testid="textarea-customer-notes"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createCustomerMutation.isPending} data-testid="button-save-customer">
              {createCustomerMutation.isPending ? "Saving..." : "Save Customer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Booking Dialog Component
function BookingDialog({ customers }: { customers: Customer[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    customerId: "",
    bookingDate: new Date().toISOString().split('T')[0],
    deliveryDate: "",
    cratesRequested: "",
    pricePerCrate: "",
    deposit: "",
    priority: "normal",
    specialRequirements: "",
    notes: "",
  });

  const createBookingMutation = useMutation({
    mutationFn: async (bookingData: any) => {
      await apiRequest("/api/bookings", {
        method: "POST",
        body: bookingData,
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Booking created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      setOpen(false);
      setFormData({
        customerId: "",
        bookingDate: new Date().toISOString().split('T')[0],
        deliveryDate: "",
        cratesRequested: "",
        pricePerCrate: "",
        deposit: "",
        priority: "normal",
        specialRequirements: "",
        notes: "",
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create booking", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId || !formData.deliveryDate || !formData.cratesRequested || !formData.pricePerCrate) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    const crates = parseInt(formData.cratesRequested);
    const pricePerCrate = parseFloat(formData.pricePerCrate);
    const totalAmount = crates * pricePerCrate;

    createBookingMutation.mutate({
      ...formData,
      cratesRequested: crates,
      pricePerCrate,
      totalAmount,
      deposit: parseFloat(formData.deposit || '0'),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="button-add-booking">
          <Plus className="mr-2 h-4 w-4" />
          New Booking
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Booking</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="customer">Customer *</Label>
            <Select
              value={formData.customerId}
              onValueChange={(value) => setFormData({ ...formData, customerId: value })}
            >
              <SelectTrigger data-testid="select-booking-customer">
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer: Customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bookingDate">Booking Date</Label>
              <Input
                id="bookingDate"
                type="date"
                value={formData.bookingDate}
                onChange={(e) => setFormData({ ...formData, bookingDate: e.target.value })}
                data-testid="input-booking-date"
              />
            </div>
            <div>
              <Label htmlFor="deliveryDate">Delivery Date *</Label>
              <Input
                id="deliveryDate"
                type="date"
                value={formData.deliveryDate}
                onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                required
                data-testid="input-delivery-date"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="crates">Crates *</Label>
              <Input
                id="crates"
                type="number"
                value={formData.cratesRequested}
                onChange={(e) => setFormData({ ...formData, cratesRequested: e.target.value })}
                placeholder="30"
                required
                data-testid="input-crates-requested"
              />
            </div>
            <div>
              <Label htmlFor="pricePerCrate">Price/Crate *</Label>
              <Input
                id="pricePerCrate"
                type="number"
                step="0.01"
                value={formData.pricePerCrate}
                onChange={(e) => setFormData({ ...formData, pricePerCrate: e.target.value })}
                placeholder="450"
                required
                data-testid="input-price-per-crate"
              />
            </div>
            <div>
              <Label htmlFor="deposit">Deposit</Label>
              <Input
                id="deposit"
                type="number"
                step="0.01"
                value={formData.deposit}
                onChange={(e) => setFormData({ ...formData, deposit: e.target.value })}
                placeholder="0"
                data-testid="input-deposit"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={formData.priority}
              onValueChange={(value) => setFormData({ ...formData, priority: value })}
            >
              <SelectTrigger data-testid="select-booking-priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="specialRequirements">Special Requirements</Label>
            <Textarea
              id="specialRequirements"
              value={formData.specialRequirements}
              onChange={(e) => setFormData({ ...formData, specialRequirements: e.target.value })}
              placeholder="Any special requirements or preferences"
              data-testid="textarea-special-requirements"
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes"
              data-testid="textarea-booking-notes"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createBookingMutation.isPending} data-testid="button-save-booking">
              {createBookingMutation.isPending ? "Creating..." : "Create Booking"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Smart Matching Panel Component
function SmartMatchingPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [matchingResults, setMatchingResults] = useState<{ matches: number; newBookings: number } | null>(null);

  const { data: productionCapacity, isLoading: capacityLoading } = useQuery({
    queryKey: ["/api/marketplace/production-capacity"],
  });

  const runMatchingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/marketplace/smart-match", {
        method: "POST",
      });
      return response;
    },
    onSuccess: (data) => {
      setMatchingResults(data);
      toast({ 
        title: "Smart Matching Complete", 
        description: `Found ${data.matches} matches and created ${data.newBookings} new bookings` 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/demand-requests"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to run smart matching", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      {/* Production Capacity Overview */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Production Capacity</CardTitle>
          </CardHeader>
          <CardContent>
            {capacityLoading ? (
              <div>Loading capacity data...</div>
            ) : productionCapacity ? (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Available Crates:</span>
                  <span className="font-medium">{productionCapacity.availableCrates}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Daily Production:</span>
                  <span className="font-medium">{productionCapacity.projectedDailyProduction} crates</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Weekly Capacity:</span>
                  <span className="font-medium">{productionCapacity.projectedDailyProduction * 7} crates</span>
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground">No capacity data available</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Matching Results</CardTitle>
          </CardHeader>
          <CardContent>
            {matchingResults ? (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Successful Matches:</span>
                  <span className="font-medium text-green-600">{matchingResults.matches}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">New Bookings Created:</span>
                  <span className="font-medium text-blue-600">{matchingResults.newBookings}</span>
                </div>
                <div className="mt-4">
                  <Badge variant="outline" className="text-green-700 bg-green-50">
                    Last run: {new Date().toLocaleString()}
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                No matching results yet. Run the algorithm to see results.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Matching Algorithm Controls */}
      <div className="text-center py-8">
        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">Smart Matching Algorithm</h3>
        <p className="text-muted-foreground max-w-md mx-auto mt-2">
          Automatically match customer demand requests with your available supply based on production capacity, pricing, delivery dates, and customer preferences.
        </p>
        
        <div className="mt-6 space-y-3">
          <Button 
            onClick={() => runMatchingMutation.mutate()}
            disabled={runMatchingMutation.isPending}
            data-testid="button-run-matching"
            className="px-8"
          >
            {runMatchingMutation.isPending ? (
              <>
                <Clock className="mr-2 h-4 w-4 animate-spin" />
                Running Algorithm...
              </>
            ) : (
              <>
                <Clock className="mr-2 h-4 w-4" />
                Run Matching Algorithm
              </>
            )}
          </Button>
          
          <div className="text-xs text-muted-foreground">
            This will automatically create bookings for matching demand requests
          </div>
        </div>
      </div>

      {/* Algorithm Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">How Smart Matching Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <span>Analyzes your current and projected egg production capacity</span>
            </div>
            <div className="flex items-start space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <span>Reviews open customer demand requests by priority and urgency</span>
            </div>
            <div className="flex items-start space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <span>Matches requests that fit your capacity and customer price expectations</span>
            </div>
            <div className="flex items-start space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <span>Creates advance bookings automatically with appropriate delivery dates</span>
            </div>
            <div className="flex items-start space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <span>Prioritizes urgent requests and high-value customers first</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
