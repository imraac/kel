import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useFarmContext } from "@/contexts/FarmContext";

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

export default function PerformanceSummary() {
  const { isAuthenticated } = useAuth();
  const { activeFarmId } = useFarmContext();

  // Fetch all required data
  const { data: weightRecords = [] } = useQuery<any[]>({
    queryKey: ["/api/weight-records"],
    enabled: isAuthenticated,
  });

  const { data: dailyRecords = [] } = useQuery<any[]>({
    queryKey: ["/api/daily-records"],
    enabled: isAuthenticated,
  });

  const { data: flocks = [] } = useQuery<any[]>({
    queryKey: ["/api/flocks"],
    enabled: isAuthenticated,
  });

  const { data: sales = [] } = useQuery<any[]>({
    queryKey: activeFarmId ? [`/api/sales?farmId=${activeFarmId}`] : ["/api/sales"],
    enabled: isAuthenticated && !!activeFarmId,
  });

  // Calculate date ranges for weekly data
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Filter weekly records
  const weeklyRecords = dailyRecords.filter((record: any) => {
    const recordDate = new Date(record.recordDate);
    return recordDate >= sevenDaysAgo && recordDate <= today;
  });

  // Filter weekly sales
  const weeklySales = sales.filter((sale: any) => {
    const saleDate = new Date(sale.saleDate);
    return saleDate >= sevenDaysAgo && saleDate <= today;
  });

  // Calculate total active birds
  const totalBirds = flocks.reduce((sum: number, flock: any) => sum + (flock.currentCount || 0), 0);

  // Calculate LAYING RATE (average weekly production rate)
  const weeklyEggs = weeklyRecords.reduce((sum: number, record: any) => sum + (record.eggsCollected || 0), 0);
  const weeklyAvgEggs = weeklyEggs / 7;
  const layingRate = totalBirds > 0 ? (weeklyAvgEggs / totalBirds) * 100 : 0;
  const layingRateTarget = 90;

  // Calculate FEED EFFICIENCY (kg feed per dozen eggs)
  const weeklyFeed = weeklyRecords.reduce((sum: number, record: any) => sum + parseFloat(record.feedConsumed || '0'), 0);
  const dozenEggs = weeklyEggs / 12;
  const feedPerDozen = dozenEggs > 0 ? weeklyFeed / dozenEggs : 0;
  // Good feed efficiency: ~1.8-2.2 kg per dozen eggs, convert to percentage (lower is better)
  // Target: 2.0 kg/dozen, so calculate as inverted percentage
  const feedEfficiencyScore = feedPerDozen > 0 ? Math.min(100, ((2.0 / feedPerDozen) * 100)) : 0;

  // Calculate MORTALITY RATE (weekly average)
  const weeklyMortality = weeklyRecords.reduce((sum: number, record: any) => sum + (record.mortalityCount || 0), 0);
  const mortalityRate = totalBirds > 0 ? (weeklyMortality / totalBirds) * 100 : 0;
  const mortalityTarget = 0.5; // 0.5% weekly is acceptable

  // Calculate REVENUE TARGET (weekly sales vs baseline target)
  const weeklyRevenue = weeklySales.reduce((sum: number, sale: any) => sum + parseFloat(sale.totalAmount || '0'), 0);
  // Use a baseline weekly target derived from expected production
  // Assuming: 80% laying rate, average price KSh 15/egg
  const expectedWeeklyEggs = totalBirds > 0 ? (totalBirds * 0.80 * 7) : 0;
  const weeklyRevenueTarget = expectedWeeklyEggs * 15;
  const revenueProgress = weeklyRevenueTarget > 0 ? (weeklyRevenue / weeklyRevenueTarget) * 100 : 0;

  // Calculate EGG QUALITY (good eggs / total eggs * 100)
  const weeklyBrokenEggs = weeklyRecords.reduce((sum: number, record: any) => sum + (record.brokenEggs || 0), 0);
  const weeklyGoodEggs = Math.max(0, weeklyEggs - weeklyBrokenEggs); // Clamp to 0 in case of data inconsistencies
  const eggQuality = weeklyEggs > 0 ? (weeklyGoodEggs / weeklyEggs) * 100 : 0;
  const eggQualityTarget = 95; // 95% is target for good quality eggs

  // Get the latest weight record with CV% data
  const latestWeightRecord = weightRecords.length > 0 ? 
    [...weightRecords].sort((a, b) => new Date(b.recordDate).getTime() - new Date(a.recordDate).getTime())[0] : 
    null;

  const latestCVPercent = latestWeightRecord?.cvPercent ? parseFloat(latestWeightRecord.cvPercent) : null;

  // Create dynamic performance data
  const performanceData = [
    {
      name: "Laying Rate",
      value: layingRate,
      target: layingRateTarget,
      status: `Target: ${layingRateTarget}% | ${weeklyAvgEggs.toFixed(2)} eggs/day`,
      color: "bg-primary",
    },
    {
      name: "Feed Efficiency",
      value: feedEfficiencyScore,
      target: 100,
      status: feedPerDozen > 0 ? `${feedPerDozen.toFixed(2)} kg/dozen eggs` : "No data",
      color: "bg-chart-2",
    },
    {
      name: "Mortality Rate",
      value: mortalityRate,
      target: mortalityTarget,
      status: `${weeklyMortality} birds this week`,
      color: "bg-orange-400",
      inverted: true,
    },
    {
      name: "Revenue Target",
      value: revenueProgress,
      target: 100,
      status: `KSh ${weeklyRevenue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} / KSh ${weeklyRevenueTarget.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
      color: "bg-chart-3",
    },
    {
      name: "Egg Quality",
      value: eggQuality,
      target: eggQualityTarget,
      status: weeklyEggs > 0 ? `${weeklyGoodEggs.toLocaleString()} good / ${weeklyEggs.toLocaleString()} total` : "No data",
      color: "bg-green-500",
    },
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
                    `${item.value.toFixed(2)}%`
                  }
                </span>
              </div>
              <Progress 
                value={(item as any).inverted 
                  ? Math.max(0, Math.min(100, 100 - ((item.value / item.target) * 100)))
                  : Math.min(100, item.value)
                } 
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
