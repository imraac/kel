import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const performanceData = [
  {
    name: "Laying Rate",
    value: 89.4,
    target: 90,
    status: "Target: 90%",
    color: "bg-primary",
  },
  {
    name: "Feed Efficiency",
    value: 92.1,
    target: 90,
    status: "Excellent",
    color: "bg-chart-2",
  },
  {
    name: "Mortality Rate",
    value: 0.31,
    target: 0.25,
    status: "Above average",
    color: "bg-orange-400",
    inverted: true,
  },
  {
    name: "Revenue Target",
    value: 78.2,
    target: 100,
    status: "KSh 268,450 / KSh 343,000",
    color: "bg-chart-3",
  },
];

export default function PerformanceSummary() {
  return (
    <Card data-testid="card-performance-summary">
      <CardHeader>
        <CardTitle>This Week's Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {performanceData.map((item) => (
            <div key={item.name}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">{item.name}</span>
                <span className="text-sm font-medium text-foreground">
                  {item.name === "Mortality Rate" ? `${item.value}%` : `${item.value}%`}
                </span>
              </div>
              <Progress 
                value={item.inverted ? (item.value / item.target) * 31 : item.value} 
                className="w-full h-2 mb-1"
                data-testid={`progress-${item.name.toLowerCase().replace(' ', '-')}`}
              />
              <p className={`text-xs mt-1 ${
                item.name === "Mortality Rate" 
                  ? "text-orange-600" 
                  : item.value >= item.target 
                    ? "text-muted-foreground" 
                    : "text-muted-foreground"
              }`}>
                {item.status}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
