import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Sprout, ShoppingCart, Package, User, Store, MapPin, LogOut, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomerSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function CustomerSidebar({ isOpen }: CustomerSidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const navigationItems = [
    { path: "/", icon: ShoppingCart, label: "Dashboard", id: "dashboard" },
    { path: "/marketplace", icon: Store, label: "Browse Products", id: "marketplace" },
  ];

  const accountItems = [
    { path: "/customer-registration", icon: User, label: "My Profile", id: "profile" },
    { path: "/settings", icon: Settings, label: "Settings", id: "settings" },
  ];

  return (
    <aside 
      className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transition-transform duration-300 ease-in-out md:relative md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
      data-testid="customer-sidebar"
    >
      <div className="flex flex-col h-full">
        {/* Logo & Customer Info */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Sprout className="text-primary-foreground text-lg" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                RoblePoultryPilot
              </h2>
              <p className="text-sm text-muted-foreground">Customer Portal</p>
            </div>
          </div>
          
          {user && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium text-foreground truncate">
                {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email}
              </p>
              <p className="text-xs text-muted-foreground">Customer</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-6">
          {/* Main Navigation */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Navigation
            </h3>
            <div className="space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.path;
                
                return (
                  <Link key={item.id} to={item.path}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className={cn(
                        "w-full justify-start gap-3 h-11",
                        isActive && "bg-secondary text-secondary-foreground"
                      )}
                      data-testid={`nav-${item.id}`}
                    >
                      <Icon size={18} />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Account Management */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Account
            </h3>
            <div className="space-y-1">
              {accountItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.path;
                
                return (
                  <Link key={item.id} to={item.path}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className={cn(
                        "w-full justify-start gap-3 h-11",
                        isActive && "bg-secondary text-secondary-foreground"
                      )}
                      data-testid={`nav-${item.id}`}
                    >
                      <Icon size={18} />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Quick Links
            </h3>
            <div className="space-y-1">
              <Link to="/marketplace">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-11"
                  data-testid="nav-explore-farms"
                >
                  <MapPin size={18} />
                  Find Local Farms
                </Button>
              </Link>
            </div>
          </div>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-border">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
            onClick={handleLogout}
            data-testid="button-logout"
          >
            <LogOut size={18} />
            Sign Out
          </Button>
        </div>
      </div>
    </aside>
  );
}