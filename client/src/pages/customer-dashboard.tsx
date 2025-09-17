import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import CustomerSidebar from "@/components/layout/customer-sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  User, 
  ShoppingBag, 
  Truck, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Settings,
  Store,
  Menu
} from "lucide-react";

interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  location?: string;
  customerType: 'individual' | 'business';
  status: string;
  createdAt: string;
}

interface Order {
  id: string;
  orderNumber: string;
  orderDate: string;
  status: 'pending' | 'confirmed' | 'processing' | 'ready' | 'delivered' | 'cancelled';
  deliveryMethod: 'pickup' | 'delivery';
  totalAmount: string;
  farmName?: string;
  estimatedDelivery?: string;
}

interface Delivery {
  id: string;
  orderId: string;
  status: 'scheduled' | 'in_transit' | 'delivered' | 'failed';
  scheduledDate: string;
  actualDate?: string;
  trackingNumber?: string;
  notes?: string;
}

export default function CustomerDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState<'overview' | 'orders' | 'profile'>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch customer profile
  const { data: customerProfile, isLoading: profileLoading } = useQuery<CustomerProfile>({
    queryKey: ['/api/customers/me'],
  });

  // Fetch customer orders - we'll need to implement this endpoint
  const { data: orders = [], isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ['/api/customers/orders'],
    enabled: !!customerProfile,
  });

  // Fetch deliveries
  const { data: deliveries = [], isLoading: deliveriesLoading } = useQuery<Delivery[]>({
    queryKey: ['/api/customers/deliveries'],
    enabled: !!customerProfile,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
      case 'confirmed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'processing':
      case 'ready':
      case 'in_transit':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'pending':
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'cancelled':
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="w-4 h-4" />;
      case 'cancelled':
      case 'failed':
        return <XCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  if (profileLoading) {
    return (
      <div className="flex h-screen bg-background">
        <CustomerSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 py-8">
            <div className="space-y-6">
              <Skeleton className="h-8 w-64" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-32" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-12 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!customerProfile) {
    return (
      <div className="flex h-screen bg-background">
        <CustomerSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 py-8">
            <Card>
              <CardContent className="text-center py-12">
                <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-2xl font-semibold mb-2">Welcome to RoblePoultryPilot</h2>
                <p className="text-muted-foreground mb-6">
                  Complete your customer profile to start placing orders and tracking deliveries.
                </p>
                <Link to="/customer-registration">
                  <Button size="lg" data-testid="button-complete-profile">
                    Complete Your Profile
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <CustomerSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      
      <main className="flex-1 overflow-auto">
        {/* Mobile menu button */}
        <div className="md:hidden p-4 border-b border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            data-testid="button-menu"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>

        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Welcome back, {customerProfile.name}
            </h1>
            <p className="text-muted-foreground">
              Manage your orders, track deliveries, and explore fresh poultry products from local farms.
            </p>
          </div>

        {/* Navigation Tabs */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
            <Button
              variant={selectedTab === 'overview' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedTab('overview')}
              data-testid="tab-overview"
            >
              Overview
            </Button>
            <Button
              variant={selectedTab === 'orders' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedTab('orders')}
              data-testid="tab-orders"
            >
              My Orders
            </Button>
            <Button
              variant={selectedTab === 'profile' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedTab('profile')}
              data-testid="tab-profile"
            >
              Profile
            </Button>
          </div>
        </div>

        {/* Overview Tab */}
        {selectedTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card data-testid="card-total-orders">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{orders.length}</div>
                  <p className="text-xs text-muted-foreground">All time</p>
                </CardContent>
              </Card>

              <Card data-testid="card-active-deliveries">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Deliveries</CardTitle>
                  <Truck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {deliveries.filter(d => ['scheduled', 'in_transit'].includes(d.status)).length}
                  </div>
                  <p className="text-xs text-muted-foreground">In progress</p>
                </CardContent>
              </Card>

              <Card data-testid="card-member-since">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Member Since</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {new Date(customerProfile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </div>
                  <p className="text-xs text-muted-foreground">Customer</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Orders */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Recent Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-6 w-20" />
                      </div>
                    ))}
                  </div>
                ) : orders.length > 0 ? (
                  <div className="space-y-4">
                    {orders.slice(0, 5).map((order) => (
                      <div key={order.id} className="flex items-center justify-between" data-testid={`order-${order.id}`}>
                        <div>
                          <p className="font-medium">Order #{order.orderNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(order.orderDate).toLocaleDateString()} • {order.farmName || 'Local Farm'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(order.status)}>
                            {getStatusIcon(order.status)}
                            <span className="ml-1 capitalize">{order.status}</span>
                          </Badge>
                          <span className="font-medium">${order.totalAmount}</span>
                        </div>
                      </div>
                    ))}
                    {orders.length > 5 && (
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => setSelectedTab('orders')}
                        data-testid="button-view-all-orders"
                      >
                        View All Orders
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No orders yet</p>
                    <Link to="/marketplace">
                      <Button data-testid="button-browse-marketplace">
                        Browse Marketplace
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Link to="/marketplace">
                    <Button variant="outline" className="w-full h-20 flex flex-col" data-testid="button-browse-products">
                      <Store className="w-6 h-6 mb-2" />
                      Browse Products
                    </Button>
                  </Link>
                  <Button 
                    variant="outline" 
                    className="w-full h-20 flex flex-col"
                    onClick={() => setSelectedTab('orders')}
                    data-testid="button-track-orders"
                  >
                    <Package className="w-6 h-6 mb-2" />
                    Track Orders
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full h-20 flex flex-col"
                    onClick={() => setSelectedTab('profile')}
                    data-testid="button-update-profile"
                  >
                    <Settings className="w-6 h-6 mb-2" />
                    Update Profile
                  </Button>
                  <Link to="/marketplace">
                    <Button variant="outline" className="w-full h-20 flex flex-col" data-testid="button-find-farms">
                      <MapPin className="w-6 h-6 mb-2" />
                      Find Farms
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Orders Tab */}
        {selectedTab === 'orders' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">My Orders</h2>
              <Link to="/marketplace">
                <Button data-testid="button-new-order">
                  <Package className="w-4 h-4 mr-2" />
                  Place New Order
                </Button>
              </Link>
            </div>

            {ordersLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <Skeleton className="h-6 w-32 mb-2" />
                      <Skeleton className="h-4 w-48 mb-4" />
                      <div className="flex justify-between">
                        <Skeleton className="h-6 w-24" />
                        <Skeleton className="h-6 w-16" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : orders.length > 0 ? (
              <div className="space-y-4">
                {orders.map((order) => (
                  <Card key={order.id} data-testid={`order-card-${order.id}`}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">Order #{order.orderNumber}</h3>
                          <p className="text-muted-foreground">
                            Placed on {new Date(order.orderDate).toLocaleDateString()}
                          </p>
                          {order.farmName && (
                            <p className="text-sm text-muted-foreground">From: {order.farmName}</p>
                          )}
                        </div>
                        <Badge className={getStatusColor(order.status)}>
                          {getStatusIcon(order.status)}
                          <span className="ml-1 capitalize">{order.status}</span>
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <Truck className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm capitalize">{order.deliveryMethod}</span>
                          </div>
                          {order.estimatedDelivery && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">
                                Est. {new Date(order.estimatedDelivery).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-lg">${order.totalAmount}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <ShoppingBag className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No orders yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Start exploring our marketplace to find fresh poultry products from local farms.
                  </p>
                  <Link to="/marketplace">
                    <Button size="lg" data-testid="button-start-shopping">
                      Start Shopping
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Profile Tab */}
        {selectedTab === 'profile' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Customer Profile</h2>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Name</label>
                    <p className="font-medium">{customerProfile.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Customer Type</label>
                    <p className="font-medium capitalize">{customerProfile.customerType}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <p className="font-medium">{customerProfile.email}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Phone</label>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <p className="font-medium">{customerProfile.phone || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
                
                {customerProfile.address && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Address</label>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-1" />
                      <div>
                        <p className="font-medium">{customerProfile.address}</p>
                        {customerProfile.location && (
                          <p className="text-sm text-muted-foreground">{customerProfile.location}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <Link to="/customer-registration">
                    <Button variant="outline" data-testid="button-edit-profile">
                      <Settings className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        </div>
      </main>
    </div>
  );
}