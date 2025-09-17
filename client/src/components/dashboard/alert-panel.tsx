import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Skull, Syringe, TrendingDown, X } from "lucide-react";
import { useFarmAlerts } from "@/hooks/useFarmAlerts";

interface Alert {
  id: string;
  type: "warning" | "danger" | "info";
  icon: "triangle" | "skull" | "syringe" | "trending-down";
  title: string;
  description: string;
  priority: "High" | "Medium" | "Low";
}


const iconMap = {
  triangle: AlertTriangle,
  skull: Skull,
  syringe: Syringe,
  "trending-down": TrendingDown,
};

const typeMap = {
  warning: {
    bg: "bg-orange-50 dark:bg-orange-900/20",
    border: "border-orange-200 dark:border-orange-800",
    icon: "text-orange-600 dark:text-orange-400",
    text: "text-orange-600 dark:text-orange-400",
  },
  danger: {
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-200 dark:border-red-800",
    icon: "text-red-600 dark:text-red-400",
    text: "text-red-600 dark:text-red-400",
  },
  info: {
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-200 dark:border-blue-800",
    icon: "text-blue-600 dark:text-blue-400",
    text: "text-blue-600 dark:text-blue-400",
  },
};

export default function AlertPanel() {
  const { alerts, isLoading } = useFarmAlerts();
  
  // Debug logging
  console.log('AlertPanel received alerts:', alerts);

  if (isLoading) {
    return (
      <Card data-testid="card-alerts">
        <CardHeader>
          <CardTitle>Farm Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading alerts...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-alerts">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Farm Alerts</CardTitle>
          <span className="text-sm text-muted-foreground">{alerts.length} active</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.map((alert) => {
            const Icon = iconMap[alert.icon];
            const styles = typeMap[alert.type];

            return (
              <div
                key={alert.id}
                className={`flex items-start space-x-3 p-3 rounded-lg border ${styles.bg} ${styles.border}`}
                data-testid={`alert-${alert.id}`}
              >
                <Icon className={`h-4 w-4 mt-0.5 ${styles.icon}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{alert.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
                  <p className={`text-xs mt-1 ${styles.text}`}>Priority: {alert.priority}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`p-1 ${styles.text} hover:${styles.text}`}
                  data-testid={`button-dismiss-alert-${alert.id}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
