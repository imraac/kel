import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Sprout, BarChart3, Baby, Scale, Egg, Wheat, Heart, ClipboardList, Receipt, TrendingUp, Users, Settings, LogOut, Store, ShoppingCart, Package2, UserCheck, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { FarmSelector } from "@/components/FarmSelector";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isOpen }: SidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const navigationItems = [
    { path: "/", icon: BarChart3, label: "Dashboard", id: "dashboard" },
    { path: "/chick-brooding", icon: Baby, label: "Chick Brooding", id: "chick-brooding" },
    { path: "/body-weights", icon: Scale, label: "Body Weights", id: "body-weights" },
    { path: "/egg-production", icon: Egg, label: "Egg Production", id: "egg-production" },
    { path: "/feed-management", icon: Wheat, label: "Feed Management", id: "feed-management" },
    { path: "/health-records", icon: Heart, label: "Health Records", id: "health-records" },
    { path: "/reports", icon: ClipboardList, label: "Reports", id: "reports" },
    { path: "/expenses", icon: Receipt, label: "Expenses", id: "expenses" },
    { path: "/break-even-analysis", icon: TrendingUp, label: "Break-Even Analysis", id: "break-even-analysis" },
  ];

  const marketplaceItems = [
    { path: "/marketplace/customers", icon: UserCheck, label: "Customers", id: "marketplace-customers" },
    { path: "/marketplace/products", icon: Package2, label: "Products", id: "marketplace-products" },
    { path: "/marketplace/orders", icon: ShoppingCart, label: "Orders", id: "marketplace-orders" },
  ];

  const managementItems = [
    { path: "/users", icon: Users, label: "Users & Permissions", id: "users", adminOnly: true },
    { path: "/farm-registration", icon: Store, label: "Farm Registration", id: "farm-registration" },
    { path: "/settings", icon: Settings, label: "Settings", id: "settings" },
  ];

  return (
    <aside 
      className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transition-transform duration-300 ease-in-out md:relative md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
      data-testid="sidebar"
    >
      <div className="flex flex-col h-full">
        {/* Logo & Farm Info */}
        <div className="p-6 border-b border-border space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Sprout className="text-primary-foreground text-lg" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">RoblePoultryPilot</h1>
              <p className="text-sm text-muted-foreground">Track & Grow</p>
            </div>
          </div>
          
          {/* Farm Selector for Admin Users */}
          <FarmSelector />
        </div>
        
        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-6 space-y-2 custom-scrollbar overflow-y-auto">
          <div className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              
              return (
                <Link
                  key={item.id}
                  href={item.path}
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                  data-testid={`nav-${item.id}`}
                >
                  <Icon className="mr-3 h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
          
          {/* Marketplace Section */}
          <div className="pt-4 border-t border-border">
            <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Marketplace
            </h3>
            <div className="space-y-1">
              {marketplaceItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.path;
                
                return (
                  <Link
                    key={item.id}
                    href={item.path}
                    className={cn(
                      "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                    data-testid={`nav-${item.id}`}
                  >
                    <Icon className="mr-3 h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
          
          {/* Management Section */}
          <div className="pt-4 border-t border-border">
            <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Management
            </h3>
            <div className="space-y-1">
              {managementItems.map((item) => {
                if (item.adminOnly && (!user || user.role !== 'admin')) return null;
                
                const Icon = item.icon;
                const isActive = location === item.path;
                
                return (
                  <Link
                    key={item.id}
                    href={item.path}
                    className={cn(
                      "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                    data-testid={`nav-${item.id}`}
                  >
                    <Icon className="mr-3 h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>
        
        {/* User Profile */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-primary-foreground text-sm font-medium">
                {user?.firstName?.[0] || 'U'}{user?.lastName?.[0] || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user?.firstName || 'Unknown'} {user?.lastName || 'User'}
              </p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role || 'staff'}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground p-1"
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
