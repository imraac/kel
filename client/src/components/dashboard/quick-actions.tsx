import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Egg, Skull, Wheat, Coins } from "lucide-react";

const actions = [
  {
    id: "record-eggs",
    title: "Record Eggs",
    description: "Daily egg collection",
    icon: Egg,
    color: "bg-chart-3/10 text-chart-3",
  },
  {
    id: "add-mortality",
    title: "Record Mortality",
    description: "Track bird losses",
    icon: Skull,
    color: "bg-red-100 text-red-600",
  },
  {
    id: "update-feed",
    title: "Update Feed",
    description: "Log feed consumption",
    icon: Wheat,
    color: "bg-orange-100 text-orange-600",
  },
  {
    id: "record-sale",
    title: "Record Sale",
    description: "Log egg sales",
    icon: Coins,
    color: "bg-green-100 text-green-600",
  },
];

export default function QuickActions() {
  return (
    <Card data-testid="card-quick-actions">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.id}
                variant="ghost"
                className="w-full flex items-center space-x-3 p-3 h-auto justify-start hover:bg-muted"
                data-testid={`button-${action.id}`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${action.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">{action.title}</p>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                </div>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
