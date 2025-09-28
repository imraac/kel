import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

// Helper function to get CV% status
const getCVStatus = (cvPercent: number | null) => {
  if (!cvPercent) return "No data";
  if (cvPercent < 5) return "Excellent uniformity";
  if (cvPercent < 8) return "Good uniformity";
  if (cvPercent < 12) return "Moderate uniformity";
  return "Poor uniformity";
};

// Helper function to get CV% performance score (0-100)
const getCVPerformanceScore = (cvPercent: number | null) => {
  if (!cvPercent) return 0;
  // Lower CV% is better, so invert the score
  // CV% < 5 = 100%, CV% 5-8 = 80%, CV% 8-12 = 60%, CV% > 12 = 40%
  if (cvPercent < 5) return 100;
  if (cvPercent < 8) return 80;
  if (cvPercent < 12) return 60;
  return 40;
};

const staticPerformanceData = [
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
  const { isAuthenticated } = useAuth();

  // Fetch latest weight records to get CV% data
  const { data: weightRecords = [] } = useQuery<any[]>({
    queryKey: ["/api/weight-records"],
    enabled: isAuthenticated,
  });

  // Get the latest weight record with CV% data
  const latestWeightRecord = weightRecords.length > 0 ? 
    weightRecords.sort((a, b) => new Date(b.recordDate).getTime() - new Date(a.recordDate).getTime())[0] : 
    null;

  const latestCVPercent = latestWeightRecord?.cvPercent ? parseFloat(latestWeightRecord.cvPercent) : null;

  // Create dynamic performance data including CV%
  const performanceData = [
    ...staticPerformanceData,
    {
      name: "Weight Uniformity",
      value: getCVPerformanceScore(latestCVPercent),
      target: 100,
      status: getCVStatus(latestCVPercent),
      color: "bg-chart-4",
      cvPercent: latestCVPercent,
    },
  ];

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
                  {item.name === "Weight Uniformity" && (item as any).cvPercent ? 
                    `CV: ${(item as any).cvPercent.toFixed(2)}%` :
                    item.name === "Mortality Rate" ? `${item.value}%` : `${item.value}%`
                  }
                </span>
              </div>
              <Progress 
                value={(item as any).inverted ? (item.value / item.target) * 31 : item.value} 
                className="w-full h-2 mb-1"
                data-testid={`progress-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
              />
              <p className={`text-xs mt-1 ${
                item.name === "Mortality Rate" 
                  ? "text-orange-600" 
                  : item.name === "Weight Uniformity" && latestCVPercent
                    ? latestCVPercent < 5 ? "text-green-600" :
                      latestCVPercent < 8 ? "text-blue-600" :
                      latestCVPercent < 12 ? "text-yellow-600" : "text-red-600"
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
