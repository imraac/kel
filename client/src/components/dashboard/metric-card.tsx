import { Card, CardContent } from "@/components/ui/card";
import { Bird, Egg, Wheat, Coins } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: "dove" | "egg" | "wheat" | "coins";
  color: "primary" | "chart-3" | "orange" | "green";
}

const iconMap = {
  dove: Bird,
  egg: Egg,
  wheat: Wheat,
  coins: Coins,
};

const colorMap = {
  primary: {
    bg: "bg-primary/10",
    text: "text-primary",
  },
  "chart-3": {
    bg: "bg-chart-3/10",
    text: "text-chart-3",
  },
  orange: {
    bg: "bg-orange-100",
    text: "text-orange-600",
  },
  green: {
    bg: "bg-green-100",
    text: "text-green-600",
  },
};

export default function MetricCard({ title, value, subtitle, icon, color }: MetricCardProps) {
  const Icon = iconMap[icon];
  const colors = colorMap[color];

  return (
    <Card data-testid={`card-metric-${title.toLowerCase().replace(' ', '-')}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center", colors.bg)}>
            <Icon className={cn("h-6 w-6", colors.text)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
