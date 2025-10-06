import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFarmContext } from "@/contexts/FarmContext";

export interface Alert {
  id: string;
  type: "warning" | "danger" | "info";
  icon: "triangle" | "skull" | "syringe" | "trending-down";
  title: string;
  description: string;
  priority: "High" | "Medium" | "Low";
}

export function useFarmAlerts() {
  const { activeFarmId, hasActiveFarm } = useFarmContext();

  // Fetch required data for alert calculations
  const { data: metrics = {} } = useQuery<any>({
    queryKey: ["/api/dashboard/metrics"],
    enabled: hasActiveFarm,
  });

  const { data: feedInventory = [] } = useQuery<any[]>({
    queryKey: [`/api/feed-inventory?farmId=${activeFarmId}`],
    enabled: hasActiveFarm,
  });

  const { data: dailyRecords = [] } = useQuery<any[]>({
    queryKey: ["/api/daily-records"],
    enabled: hasActiveFarm,
  });

  const { data: healthRecords = [] } = useQuery<any[]>({
    queryKey: [`/api/health-records?limit=100`],
    enabled: hasActiveFarm,
  });

  // Calculate dynamic alerts based on real farm data
  const alerts = useMemo((): Alert[] => {
    if (!hasActiveFarm) return [];

    const calculatedAlerts: Alert[] = [];
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // 1. Feed Stock Alert - Dynamic calculation based on actual data
    const feedDaysRemaining = metrics?.feedDaysRemaining ?? 0;
    const totalFeedStock = metrics?.totalFeedStock ?? 0;
    
    if (totalFeedStock > 0) {
      if (feedDaysRemaining < 3) {
        calculatedAlerts.push({
          id: "feed-stock-critical",
          type: "danger",
          icon: "triangle",
          title: "Feed Stock Critical",
          description: `Only ${feedDaysRemaining} ${feedDaysRemaining === 1 ? 'day' : 'days'} of feed remaining! Order immediately to avoid running out.`,
          priority: "High",
        });
      } else if (feedDaysRemaining < 7) {
        calculatedAlerts.push({
          id: "feed-stock-low",
          type: "warning",
          icon: "triangle",
          title: "Feed Stock Running Low",
          description: `Approximately ${feedDaysRemaining} ${feedDaysRemaining === 1 ? 'day' : 'days'} of feed remaining. Consider ordering soon.`,
          priority: "Medium",
        });
      }
    }

    // 2. Mortality Rate Alert - Dynamic calculation from daily records (per-day aggregation)
    if (dailyRecords.length > 0) {
      // Get yesterday's mortality (aggregate all records for that day)
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      const yesterdayRecords = dailyRecords.filter(r => r.recordDate === yesterdayStr);
      const yesterdayMortality = yesterdayRecords.reduce((sum, r) => sum + (r.mortalityCount || 0), 0);
      
      // Calculate 14-day average mortality per day (excluding yesterday)
      const fourteenDaysAgo = new Date(today);
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      
      const recentRecords = dailyRecords.filter(r => {
        const recordDate = new Date(r.recordDate);
        return recordDate >= fourteenDaysAgo && r.recordDate !== yesterdayStr;
      });
      
      // Group by date and sum mortality per day
      const mortalityByDate = recentRecords.reduce((acc, r) => {
        const date = r.recordDate;
        acc[date] = (acc[date] || 0) + (r.mortalityCount || 0);
        return acc;
      }, {} as Record<string, number>);
      
      const dailyMortalityValues = Object.values(mortalityByDate);
      const avgMortality = dailyMortalityValues.length > 0
        ? dailyMortalityValues.reduce((sum, val) => sum + val, 0) / dailyMortalityValues.length
        : 0;
      
      // Threshold: 1% of total birds or 2x daily average (whichever is higher)
      const totalBirds = metrics?.totalBirds ?? 0;
      const threshold = Math.max(totalBirds * 0.01, avgMortality * 2);
      
      if (yesterdayMortality > threshold && yesterdayMortality > 0) {
        calculatedAlerts.push({
          id: "mortality-high",
          type: "danger",
          icon: "skull",
          title: "Mortality Rate Above Normal",
          description: `${yesterdayMortality} ${yesterdayMortality === 1 ? 'bird' : 'birds'} lost yesterday vs average of ${avgMortality.toFixed(1)} per day. Check for signs of disease.`,
          priority: "High",
        });
      }
    }

    // 3. Vaccination Alert - Dynamic from health records
    if (healthRecords.length > 0) {
      const todayStr = today.toISOString().split('T')[0];
      const threeDaysFromNow = new Date(today);
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      
      // Find upcoming vaccinations (nextDueDate within 7 days)
      const upcomingVaccinations = healthRecords.filter(record => {
        if (record.recordType !== 'vaccination' || !record.nextDueDate) return false;
        const dueDate = new Date(record.nextDueDate);
        const daysUntilDue = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilDue >= 0 && daysUntilDue <= 7;
      }).sort((a, b) => {
        return new Date(a.nextDueDate!).getTime() - new Date(b.nextDueDate!).getTime();
      });
      
      if (upcomingVaccinations.length > 0) {
        const nextVaccination = upcomingVaccinations[0];
        const dueDate = new Date(nextVaccination.nextDueDate!);
        const daysUntilDue = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        calculatedAlerts.push({
          id: "vaccination-due",
          type: daysUntilDue <= 3 ? "warning" : "info",
          icon: "syringe",
          title: daysUntilDue === 0 ? "Vaccination Due Today" : "Vaccination Due Soon",
          description: `${nextVaccination.title || 'Vaccination'} due in ${daysUntilDue} ${daysUntilDue === 1 ? 'day' : 'days'}.`,
          priority: daysUntilDue <= 3 ? "Medium" : "Low",
        });
      }
    }

    // 4. Production Efficiency Alert - Dynamic from daily records (per-day aggregation)
    if (dailyRecords.length > 1) {
      // Get today's and yesterday's production (aggregate by day)
      const todayStr = today.toISOString().split('T')[0];
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      const recentRecords = dailyRecords.filter(r => 
        r.recordDate === todayStr || r.recordDate === yesterdayStr
      );
      
      const recentEggs = recentRecords.reduce((sum, r) => sum + (r.eggsCollected || 0), 0);
      
      // Calculate 14-day average production per day
      const fourteenDaysAgo = new Date(today);
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      
      const historicalRecords = dailyRecords.filter(r => {
        const recordDate = new Date(r.recordDate);
        return recordDate >= fourteenDaysAgo && recordDate < twoDaysAgo;
      });
      
      // Group by date and sum eggs per day
      const eggsByDate = historicalRecords.reduce((acc, r) => {
        const date = r.recordDate;
        acc[date] = (acc[date] || 0) + (r.eggsCollected || 0);
        return acc;
      }, {} as Record<string, number>);
      
      const dailyEggValues = Object.values(eggsByDate);
      const avgDailyProduction = dailyEggValues.length > 0
        ? dailyEggValues.reduce((sum, val) => sum + val, 0) / dailyEggValues.length
        : 0;
      
      // Compare 2-day total to 2x daily average (15% drop threshold)
      const expectedTwoDayProduction = avgDailyProduction * 2;
      
      if (expectedTwoDayProduction > 0 && recentEggs < expectedTwoDayProduction * 0.85) {
        const dropPercentage = ((expectedTwoDayProduction - recentEggs) / expectedTwoDayProduction * 100).toFixed(1);
        calculatedAlerts.push({
          id: "production-drop",
          type: "danger",
          icon: "trending-down",
          title: "Production Efficiency Drop",
          description: `Egg production dropped ${dropPercentage}% (${recentEggs.toFixed(0)} vs ${expectedTwoDayProduction.toFixed(0)} expected). Investigate immediately.`,
          priority: "High",
        });
      }
    }

    return calculatedAlerts;
  }, [feedInventory, dailyRecords, healthRecords, metrics, hasActiveFarm, activeFarmId]);

  return {
    alerts,
    isLoading: false, // Derived from existing queries
    error: null,
  };
}