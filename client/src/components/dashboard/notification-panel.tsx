import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Bell, AlertTriangle, Info, CheckCircle, Clock, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "alert" | "info" | "success" | "warning";
  timestamp: string;
  read: boolean;
}

export default function NotificationPanel() {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      title: "Low Feed Stock Alert",
      message: "Feed levels are running low. Only 5 days remaining for Flock Alpha.",
      type: "warning",
      timestamp: "2 hours ago",
      read: false,
    },
    {
      id: "2", 
      title: "High Mortality Rate",
      message: "Unusual mortality rate detected in Flock Beta. Consider veterinary check.",
      type: "alert",
      timestamp: "4 hours ago", 
      read: false,
    },
    {
      id: "3",
      title: "Production Goal Achieved",
      message: "Daily egg production exceeded target by 12%. Great work!",
      type: "success",
      timestamp: "1 day ago",
      read: true,
    },
    {
      id: "4",
      title: "Temperature Alert",
      message: "Brooding temperature dropped below recommended range in Coop 1.",
      type: "warning", 
      timestamp: "2 days ago",
      read: false,
    },
    {
      id: "5",
      title: "Vaccination Reminder",
      message: "Newcastle disease vaccination due for Flock Charlie in 3 days.",
      type: "info",
      timestamp: "3 days ago",
      read: true,
    },
  ]);

  // Get metrics for generating dynamic alerts
  const { data: metrics = {} } = useQuery<any>({
    queryKey: ["/api/dashboard/metrics"],
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "alert": return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "warning": return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case "success": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "info": return <Info className="h-4 w-4 text-blue-500" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case "alert": return "destructive";
      case "warning": return "secondary";
      case "success": return "default";
      case "info": return "outline";
      default: return "secondary";
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="relative"
          data-testid="button-notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-80"
        data-testid="dropdown-notifications"
      >
        <div className="flex items-center justify-between px-2 py-2">
          <DropdownMenuLabel>Notifications ({unreadCount} new)</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs"
              data-testid="button-mark-all-read"
            >
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        
        <ScrollArea className="h-80">
          <div className="space-y-1">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                <Bell className="h-8 w-8 mb-2" />
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className={`flex flex-col items-start p-3 cursor-pointer ${
                    !notification.read ? "bg-blue-50 dark:bg-blue-950" : ""
                  }`}
                  onClick={() => markAsRead(notification.id)}
                  data-testid={`notification-${notification.id}`}
                >
                  <div className="flex items-start justify-between w-full">
                    <div className="flex items-start space-x-2 flex-1">
                      {getIcon(notification.type)}
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium truncate">
                            {notification.title}
                          </p>
                          <Badge 
                            variant={getBadgeVariant(notification.type)}
                            className="text-xs"
                          >
                            {notification.type}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {notification.timestamp}
                          </span>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeNotification(notification.id);
                      }}
                      className="ml-2 h-6 w-6 p-0"
                      data-testid={`button-remove-${notification.id}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </DropdownMenuItem>
              ))
            )}
          </div>
        </ScrollArea>
        
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="justify-center">
              <Button variant="ghost" size="sm" className="text-xs">
                View All Notifications
              </Button>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}