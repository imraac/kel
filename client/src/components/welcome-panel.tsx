import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sprout, Shield, Users, ShoppingCart, Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

interface WelcomePanelProps {
  onDashboardClick: () => void;
}

export default function WelcomePanel({ onDashboardClick }: WelcomePanelProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const getRoleInfo = (role: string) => {
    switch (role) {
      case 'admin':
        return {
          icon: Shield,
          description: "You have full system access to manage all farms, users, and system settings across the platform.",
          color: "text-red-600 dark:text-red-400"
        };
      case 'farm_owner':
        return {
          icon: Sprout,
          description: "You can manage your farm operations, view reports, and oversee staff activities for your poultry farm.",
          color: "text-green-600 dark:text-green-400"
        };
      case 'manager':
        return {
          icon: Users,
          description: "You can supervise daily operations, manage staff, and monitor farm performance and productivity.",
          color: "text-blue-600 dark:text-blue-400"
        };
      case 'staff':
        return {
          icon: Settings,
          description: "You can record daily activities, track production data, and manage routine farm operations.",
          color: "text-purple-600 dark:text-purple-400"
        };
      case 'customer':
        return {
          icon: ShoppingCart,
          description: "You can browse products, place orders, and manage your purchases from our marketplace.",
          color: "text-orange-600 dark:text-orange-400"
        };
      default:
        return {
          icon: Users,
          description: "Welcome to RoblePoultryPilot! Your account is being set up.",
          color: "text-gray-600 dark:text-gray-400"
        };
    }
  };

  const roleInfo = getRoleInfo(user?.role || '');
  const IconComponent = roleInfo.icon;

  // Get user's display name
  const userName = user?.firstName && user?.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user?.email?.split('@')[0] || 'User';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="welcome-panel-overlay">
      <Card className="max-w-lg mx-4 animate-in fade-in-0 zoom-in-95 duration-300" data-testid="welcome-panel">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className={`w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center`}>
              <IconComponent className={`w-8 h-8 ${roleInfo.color}`} />
            </div>
          </div>
          <CardTitle className="text-2xl">Welcome, {userName}!</CardTitle>
          <CardDescription className="text-base capitalize">
            You are signed in as a <span className={`font-medium ${roleInfo.color}`}>{user?.role?.replace('_', ' ')}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground text-center">
            {roleInfo.description}
          </p>
          
          <Button 
            onClick={onDashboardClick} 
            className="w-full" 
            size="lg"
            data-testid="button-go-to-dashboard"
          >
            Go to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}