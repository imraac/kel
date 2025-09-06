import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Egg, Skull, Wheat, Coins } from "lucide-react";

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  createdAt: string;
  userId?: string;
}

interface ActivityFeedProps {
  activity: ActivityItem[];
}

const activityIcons = {
  daily_record: Egg,
  mortality: Skull,
  feed: Wheat,
  sale: Coins,
};

const activityColors = {
  daily_record: "bg-chart-3/10 text-chart-3",
  mortality: "bg-red-100 text-red-600",
  feed: "bg-orange-100 text-orange-600",
  sale: "bg-green-100 text-green-600",
};

export default function ActivityFeed({ activity }: ActivityFeedProps) {
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} hours ago`;
    }
    
    return date.toLocaleDateString();
  };

  const getActivityIcon = (type: string) => {
    return activityIcons[type as keyof typeof activityIcons] || Egg;
  };

  const getActivityColor = (type: string) => {
    return activityColors[type as keyof typeof activityColors] || "bg-muted text-muted-foreground";
  };

  return (
    <Card data-testid="card-activity-feed">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Recent Activity</CardTitle>
          <Button variant="ghost" size="sm" data-testid="button-view-all-activity">
            View all
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {activity.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activity.slice(0, 4).map((item) => {
              const Icon = getActivityIcon(item.type);
              const colorClass = getActivityColor(item.type);

              return (
                <div key={item.id} className="flex items-start space-x-3" data-testid={`activity-${item.id}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-foreground">{item.description}</p>
                    <p className="text-xs text-muted-foreground">{formatTimeAgo(item.createdAt)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
