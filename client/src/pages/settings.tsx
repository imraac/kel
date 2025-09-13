import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import Sidebar from "@/components/layout/sidebar";
import { Menu, Settings as SettingsIcon, User, Bell, Shield, Database, Download } from "lucide-react";

export default function Settings() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading settings...</p>
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
                <h2 className="text-xl font-semibold text-foreground">Settings</h2>
                <p className="text-sm text-muted-foreground">Manage your account and application preferences</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-4 md:p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Settings</h1>
              <p className="text-muted-foreground">Configure your account and application preferences</p>
            </div>
          </div>

          <div className="grid gap-6">
            {/* Profile Settings */}
            <Card data-testid="card-profile-settings">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
                <CardDescription>
                  Your account details and profile information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={user?.firstName || ""}
                      readOnly
                      data-testid="input-first-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={user?.lastName || ""}
                      readOnly
                      data-testid="input-last-name"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ""}
                    readOnly
                    data-testid="input-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant={user?.role === 'admin' ? 'default' : 'secondary'} data-testid="badge-role">
                      {user?.role === 'admin' ? 'Administrator' : 'Staff Member'}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {user?.role === 'admin' 
                        ? 'Full access to all features and user management'
                        : 'Access to farm operations and data entry'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Access Control Info */}
            <Card data-testid="card-access-control">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Access Control & Permissions
                </CardTitle>
                <CardDescription>
                  Understanding your access levels and permissions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium">Farm Operations Access</p>
                      <p className="text-sm text-muted-foreground">
                        You can manage daily records, egg production, feed management, health records, and expenses for your farm.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium">Marketplace Access</p>
                      <p className="text-sm text-muted-foreground">
                        You can manage customers, products, and orders through the integrated marketplace platform.
                      </p>
                    </div>
                  </div>
                  {user?.role === 'admin' && (
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                      <div>
                        <p className="font-medium">Administrative Access</p>
                        <p className="text-sm text-muted-foreground">
                          As an admin, you can manage users, assign roles, and access all farm data across the platform.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Application Preferences */}
            <Card data-testid="card-preferences">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SettingsIcon className="h-5 w-5" />
                  Application Preferences
                </CardTitle>
                <CardDescription>
                  Customize your application experience
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="notifications">Enable Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive alerts for low feed levels, health reminders, and production updates
                    </p>
                  </div>
                  <Switch id="notifications" defaultChecked data-testid="switch-notifications" />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-calculations">Auto-calculate Totals</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically calculate totals in sales and expense forms
                    </p>
                  </div>
                  <Switch id="auto-calculations" defaultChecked data-testid="switch-auto-calculations" />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="daily-reminders">Daily Record Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Get reminded to enter daily production and brooding records
                    </p>
                  </div>
                  <Switch id="daily-reminders" defaultChecked data-testid="switch-daily-reminders" />
                </div>
              </CardContent>
            </Card>

            {/* Data & Privacy */}
            <Card data-testid="card-data-privacy">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Data & Privacy
                </CardTitle>
                <CardDescription>
                  Manage your data and privacy settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Data Backup</Label>
                    <p className="text-sm text-muted-foreground">
                      Your farm data is automatically backed up daily to ensure security
                    </p>
                  </div>
                  <Button variant="outline" data-testid="button-export-data">
                    <Download className="h-4 w-4 mr-2" />
                    Export Data
                  </Button>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Data Retention</Label>
                  <p className="text-sm text-muted-foreground">
                    Farm records are retained indefinitely for historical analysis. 
                    Contact support if you need specific data removal.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}