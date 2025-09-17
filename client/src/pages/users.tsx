import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isUnauthorizedError, hasManagementRole } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Users, Shield, UserPlus, Menu, Settings, Crown, User as UserIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { User } from "@shared/schema";

const userFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  role: z.enum(["admin", "farm_owner", "manager", "staff", "customer"], {
    required_error: "Role is required",
  }),
  farmId: z.string().optional(),
}).refine((data) => {
  // Farm ID is required for manager, staff, farm_owner roles
  const rolesThatNeedFarm = ["manager", "staff", "farm_owner"];
  if (rolesThatNeedFarm.includes(data.role) && !data.farmId) {
    return false;
  }
  return true;
}, {
  message: "Farm selection is required for manager, staff, and farm owner roles",
  path: ["farmId"],
});

type UserFormData = z.infer<typeof userFormSchema>;

// Activity type based on the API response structure
type Activity = {
  id: string;
  type: string; // flexible to support multiple activity types
  description: string;
  createdAt: string;
  userId: string;
};

export default function UsersPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user: currentUser, isLoading, isAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
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

  // Check if user is admin or manager
  useEffect(() => {
    if (!isLoading && isAuthenticated && !hasManagementRole(currentUser)) {
      toast({
        title: "Access Denied",
        description: "You need admin or manager privileges to access this page",
        variant: "destructive",
      });
      // Redirect to home page
      setLocation("/");
      return;
    }
  }, [currentUser, isAuthenticated, isLoading, toast]);

  const { data: users, error: usersError } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isAuthenticated && hasManagementRole(currentUser),
  });

  const { data: activity, error: activityError, isLoading: activityLoading } = useQuery<Activity[]>({
    queryKey: ["/api/dashboard/activity"],
    enabled: isAuthenticated && hasManagementRole(currentUser),
  });

  // Fetch farms for farm selection dropdown (admins only)
  const { data: farms } = useQuery<any[]>({
    queryKey: ["/api/farms"],
    enabled: isAuthenticated && currentUser?.role === 'admin',
  });

  // Handle unauthorized errors
  useEffect(() => {
    if ((usersError && isUnauthorizedError(usersError)) || (activityError && isUnauthorizedError(activityError))) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [usersError, activityError, toast]);

  const userForm = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      role: "staff",
      farmId: "",
    },
  });

  // Watch role changes to conditionally show farm selector
  const selectedRole = userForm.watch("role");
  const rolesThatNeedFarm = ["manager", "staff", "farm_owner"];
  const shouldShowFarmSelector = rolesThatNeedFarm.includes(selectedRole);

  // Clear farmId when role doesn't need it
  useEffect(() => {
    if (!shouldShowFarmSelector) {
      userForm.setValue("farmId", "");
    }
  }, [shouldShowFarmSelector, userForm]);

  const createUserMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      await apiRequest("POST", "/api/users", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User created successfully",
      });
      userForm.reset();
      setUserDialogOpen(false);
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
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading user management...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !hasManagementRole(currentUser)) {
    return null;
  }

  const displayUsers = users || [];
  const adminUsers = displayUsers.filter((user: User) => user.role === 'admin');
  const managerUsers = displayUsers.filter((user: User) => user.role === 'manager');
  const farmOwnerUsers = displayUsers.filter((user: User) => user.role === 'farm_owner');
  const staffUsers = displayUsers.filter((user: User) => user.role === 'staff');
  const customerUsers = displayUsers.filter((user: User) => user.role === 'customer');
  const activeUsers = displayUsers.filter((user: User) => {
    if (!user.lastActive) return false;
    const lastActive = new Date(user.lastActive);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return lastActive >= yesterday;
  });

  const onSubmitUser = (data: UserFormData) => {
    createUserMutation.mutate(data);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return Crown;
      case 'farm_owner': return Shield;
      case 'manager': return Settings;
      case 'customer': return UserIcon;
      default: return UserIcon; // staff and others
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return { variant: "default" as const, color: "text-primary" };
      case 'farm_owner':
        return { variant: "default" as const, color: "text-green-600" };
      case 'manager':
        return { variant: "secondary" as const, color: "text-blue-600" };
      case 'customer':
        return { variant: "outline" as const, color: "text-purple-600" };
      default: // staff
        return { variant: "secondary" as const, color: "text-muted-foreground" };
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
    return initials.trim() || '?';
  };

  const formatLastActive = (lastActive: string) => {
    const date = new Date(lastActive);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
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
                <h2 className="text-xl font-semibold text-foreground">Users & Permissions</h2>
                <p className="text-sm text-muted-foreground">Manage farm staff and access controls</p>
              </div>
            </div>
            
            <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-user">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New User</DialogTitle>
                </DialogHeader>
                <Form {...userForm}>
                  <form onSubmit={userForm.handleSubmit(onSubmitUser)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={userForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="John" data-testid="input-first-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={userForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Doe" data-testid="input-last-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={userForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              {...field} 
                              placeholder="john.doe@example.com" 
                              data-testid="input-email" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={userForm.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Role</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-role">
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="staff">Staff</SelectItem>
                              {currentUser?.role === 'admin' && (
                                <>
                                  <SelectItem value="manager">Manager</SelectItem>
                                  <SelectItem value="farm_owner">Farm Owner</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="customer">Customer</SelectItem>
                                </>
                              )}
                              {currentUser?.role === 'manager' && (
                                <>
                                  <SelectItem value="manager">Manager</SelectItem>
                                  <SelectItem value="customer">Customer</SelectItem>
                                </>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Farm Selector - Only show for roles that need a farm */}
                    {shouldShowFarmSelector && (
                      <FormField
                        control={userForm.control}
                        name="farmId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Farm <span className="text-red-500">*</span></FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-farm">
                                  <SelectValue placeholder="Select farm" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {farms && farms.length > 0 ? (
                                  farms.map((farm) => (
                                    <SelectItem 
                                      key={farm.id} 
                                      value={farm.id}
                                      data-testid={`option-farm-${farm.id}`}
                                    >
                                      {farm.name}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="" disabled>
                                    No farms available
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                            {(!farms || farms.length === 0) && (
                              <p className="text-sm text-muted-foreground">
                                Create a farm first to assign {selectedRole} users
                              </p>
                            )}
                          </FormItem>
                        )}
                      />
                    )}

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={createUserMutation.isPending || (shouldShowFarmSelector && (!farms || farms.length === 0))}
                      data-testid="button-submit-user"
                    >
                      {createUserMutation.isPending ? "Creating..." : "Create User"}
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
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            <Card data-testid="card-total-users">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                    <p className="text-2xl font-bold text-foreground">{displayUsers.length}</p>
                    <p className="text-xs text-muted-foreground">Active accounts</p>
                  </div>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-admin-users">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Administrators</p>
                    <p className="text-2xl font-bold text-foreground">{adminUsers.length}</p>
                    <p className="text-xs text-green-600">Full access</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Crown className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-manager-users">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Managers</p>
                    <p className="text-2xl font-bold text-foreground">{managerUsers.length}</p>
                    <p className="text-xs text-blue-600">Management access</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Settings className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-staff-users">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Staff Members</p>
                    <p className="text-2xl font-bold text-foreground">{staffUsers.length}</p>
                    <p className="text-xs text-gray-600">Standard access</p>
                  </div>
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <UserIcon className="h-6 w-6 text-gray-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-active-users">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Today</p>
                    <p className="text-2xl font-bold text-foreground">{activeUsers.length}</p>
                    <p className="text-xs text-orange-600">Last 24 hours</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Shield className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-farm-owner-users">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Farm Owners</p>
                    <p className="text-2xl font-bold text-foreground">{farmOwnerUsers.length}</p>
                    <p className="text-xs text-yellow-600">Owner privileges</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Shield className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="all-users" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all-users">All Users</TabsTrigger>
              <TabsTrigger value="permissions">Permissions</TabsTrigger>
              <TabsTrigger value="activity">User Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="all-users">
              <Card data-testid="card-all-users">
                <CardHeader>
                  <CardTitle>Farm Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {displayUsers.map((user: User) => {
                      const RoleIcon = getRoleIcon(user.role);
                      const roleBadge = getRoleBadge(user.role);
                      
                      return (
                        <div 
                          key={user.id} 
                          className="flex items-center justify-between p-4 border border-border rounded-lg"
                          data-testid={`user-card-${user.id}`}
                        >
                          <div className="flex items-center space-x-4">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={user.profileImageUrl} />
                              <AvatarFallback>
                                {getInitials(user.firstName, user.lastName)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="font-semibold text-foreground">
                                {user.firstName} {user.lastName}
                              </h3>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge variant={roleBadge.variant} className="capitalize">
                                  <RoleIcon className="h-3 w-3 mr-1" />
                                  {user.role}
                                </Badge>
                                {user.lastActive && (
                                  <span className="text-xs text-muted-foreground">
                                    Last active: {formatLastActive(user.lastActive)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {/* Edit functionality not yet implemented - removed to avoid dead-end UX */}
                            {user.id !== currentUser?.id && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-red-600 hover:text-red-700"
                                data-testid={`button-disable-user-${user.id}`}
                              >
                                Disable
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="permissions">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card data-testid="card-role-permissions">
                  <CardHeader>
                    <CardTitle>Role Permissions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-4 border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <Crown className="h-5 w-5 text-green-600" />
                          <h3 className="font-semibold text-green-800 dark:text-green-200">Administrator</h3>
                        </div>
                        <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                          <li>• Full access to all farm data</li>
                          <li>• User management and permissions</li>
                          <li>• Financial reports and analytics</li>
                          <li>• System settings and configuration</li>
                          <li>• Export and backup capabilities</li>
                        </ul>
                      </div>

                      <div className="p-4 border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <Shield className="h-5 w-5 text-yellow-600" />
                          <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">Farm Owner</h3>
                        </div>
                        <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                          <li>• Full farm ownership and control</li>
                          <li>• Manage farm settings and configuration</li>
                          <li>• Access to all farm financial data</li>
                          <li>• Receive notifications and alerts</li>
                          <li>• Create and manage flocks</li>
                        </ul>
                      </div>

                      <div className="p-4 border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <Settings className="h-5 w-5 text-blue-600" />
                          <h3 className="font-semibold text-blue-800 dark:text-blue-200">Manager</h3>
                        </div>
                        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                          <li>• Create and manage users (staff, customers)</li>
                          <li>• Oversee daily farm operations</li>
                          <li>• Access to production analytics</li>
                          <li>• Receive notifications and alerts</li>
                          <li>• Review and approve daily records</li>
                        </ul>
                      </div>

                      <div className="p-4 border border-gray-200 bg-gray-50 dark:bg-gray-900/20 dark:border-gray-800 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <UserIcon className="h-5 w-5 text-gray-600" />
                          <h3 className="font-semibold text-gray-800 dark:text-gray-200">Staff Member</h3>
                        </div>
                        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                          <li>• Record daily farm activities</li>
                          <li>• View production reports</li>
                          <li>• Add expenses and sales</li>
                          <li>• Update feed and health records</li>
                          <li>• Limited access to analytics</li>
                        </ul>
                      </div>

                      <div className="p-4 border border-purple-200 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-800 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <UserIcon className="h-5 w-5 text-purple-600" />
                          <h3 className="font-semibold text-purple-800 dark:text-purple-200">Customer</h3>
                        </div>
                        <ul className="text-sm text-purple-700 dark:text-purple-300 space-y-1">
                          <li>• Browse and view available products</li>
                          <li>• Place orders for eggs and chickens</li>
                          <li>• Track order status and delivery</li>
                          <li>• View order history</li>
                          <li>• Contact farm for support</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="card-access-controls">
                  <CardHeader>
                    <CardTitle>Access Controls</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                        <div>
                          <p className="font-medium">Session Timeout</p>
                          <p className="text-sm text-muted-foreground">Auto logout after inactivity</p>
                        </div>
                        <Badge variant="outline">1 hour</Badge>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                        <div>
                          <p className="font-medium">Password Requirements</p>
                          <p className="text-sm text-muted-foreground">Minimum security standards</p>
                        </div>
                        <Badge variant="outline">Strong</Badge>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                        <div>
                          <p className="font-medium">Two-Factor Authentication</p>
                          <p className="text-sm text-muted-foreground">Additional security layer</p>
                        </div>
                        <Badge variant="secondary">Optional</Badge>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                        <div>
                          <p className="font-medium">Audit Logging</p>
                          <p className="text-sm text-muted-foreground">Track user actions</p>
                        </div>
                        <Badge variant="default">Enabled</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="activity">
              <Card data-testid="card-user-activity">
                <CardHeader>
                  <CardTitle>Recent User Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {activityLoading ? (
                      // Loading skeleton
                      <div data-testid="status-activity-loading">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <div key={index} className="flex items-start space-x-3 p-3 bg-muted/50 rounded animate-pulse">
                            <div className="h-8 w-8 bg-muted rounded-full" />
                            <div className="flex-1 space-y-2">
                              <div className="h-4 bg-muted rounded w-3/4" />
                              <div className="h-3 bg-muted rounded w-1/2" />
                            </div>
                            <div className="h-5 bg-muted rounded w-16" />
                          </div>
                        ))}
                      </div>
                    ) : activity && activity.length > 0 ? (
                      // Activity items
                      activity.slice(0, 10).map((item: any, index: number) => (
                        <div key={item.id || index} className="flex items-start space-x-3 p-3 bg-muted/50 rounded">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {item.userId ? getInitials("User", "Name") : "SY"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm text-foreground">{item.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(item.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {item.type}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      // Empty state
                      <div data-testid="status-activity-empty" className="text-center py-8">
                        <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No recent activity</p>
                      </div>
                    )}
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
