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

    // 1. Feed Stock Running Low Alert
    if (feedInventory.length > 0) {
      const totalFeedKg = feedInventory.reduce((sum, feed) => {
        return sum + (parseFloat(feed.quantityKg) || 0);
      }, 0);

      // Estimate daily consumption: 0.11kg per bird (industry standard)
      const totalBirds = metrics.totalBirds || 0;
      const estimatedDailyConsumption = totalBirds * 0.11;
      
      if (estimatedDailyConsumption > 0) {
        const daysRemaining = Math.floor(totalFeedKg / estimatedDailyConsumption);
        
        if (daysRemaining <= 3) {
          calculatedAlerts.push({
            id: "feed-stock-critical",
            type: "danger",
            icon: "triangle",
            title: "Feed Stock Critical",
            description: `Only ${daysRemaining} days of feed remaining. Immediate action required.`,
            priority: "High",
          });
        } else if (daysRemaining <= 7) {
          calculatedAlerts.push({
            id: "feed-stock-low",
            type: "warning",
            icon: "triangle",
            title: "Feed Stock Running Low",
            description: `Approximately ${daysRemaining} days of feed remaining. Consider ordering soon.`,
            priority: "Medium",
          });
        }
      }
    }

    // 2. Mortality Rate Above Normal Alert
    if (dailyRecords.length > 0) {
      // Get yesterday's mortality
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const yesterdayMortality = dailyRecords
        .filter(record => record.recordDate === yesterdayStr)
        .reduce((sum, record) => sum + (record.mortalityCount || 0), 0);

      // Calculate 14-day average mortality (excluding yesterday)
      const fourteenDaysAgo = new Date(today);
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 15);
      
      const recentRecords = dailyRecords.filter(record => {
        const recordDate = new Date(record.recordDate);
        return recordDate >= fourteenDaysAgo && recordDate < yesterday;
      });

      if (recentRecords.length > 0) {
        const avgMortality = recentRecords.reduce((sum, record) => 
          sum + (record.mortalityCount || 0), 0) / recentRecords.length;

        const totalBirds = metrics.totalBirds || 0;
        const mortalityRate = totalBirds > 0 ? (yesterdayMortality / totalBirds) * 100 : 0;

        if (mortalityRate > 1.0 || yesterdayMortality > avgMortality * 2) {
          calculatedAlerts.push({
            id: "mortality-high",
            type: "danger", 
            icon: "skull",
            title: "Mortality Rate Above Normal",
            description: `${yesterdayMortality} birds lost yesterday vs average of ${Math.round(avgMortality)}. Check for signs of disease.`,
            priority: "High",
          });
        }
      }
    }

    // 3. Vaccination Due Alert
    if (healthRecords.length > 0) {
      const upcomingVaccinations = healthRecords.filter(record => {
        if (record.type !== 'vaccination' || !record.scheduledDate) return false;
        
        const scheduledDate = new Date(record.scheduledDate);
        const daysUntil = Math.ceil((scheduledDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        return daysUntil >= 0 && daysUntil <= 7; // Due within 7 days
      });

      upcomingVaccinations.forEach(vaccination => {
        const scheduledDate = new Date(vaccination.scheduledDate);
        const daysUntil = Math.ceil((scheduledDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntil <= 0) {
          calculatedAlerts.push({
            id: `vaccination-overdue-${vaccination.id}`,
            type: "danger",
            icon: "syringe",
            title: "Vaccination Overdue",
            description: `${vaccination.treatment} vaccination is overdue. Schedule immediately.`,
            priority: "High",
          });
        } else if (daysUntil <= 3) {
          calculatedAlerts.push({
            id: `vaccination-due-${vaccination.id}`,
            type: "info",
            icon: "syringe", 
            title: "Vaccination Due Soon",
            description: `${vaccination.treatment} vaccination due in ${daysUntil} days.`,
            priority: "Medium",
          });
        }
      });
    }

    // 4. Production Efficiency Drop Alert (NEW 4th Alert)
    if (dailyRecords.length > 0 && metrics.totalBirds > 0) {
      // Get today's egg production
      const todayStr = today.toISOString().split('T')[0];
      const todayEggs = dailyRecords
        .filter(record => record.recordDate === todayStr)
        .reduce((sum, record) => sum + (record.eggsCollected || 0), 0);

      // Calculate 14-day average production (excluding today)
      const fourteenDaysAgo = new Date(today);
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      
      const recentProductionRecords = dailyRecords.filter(record => {
        const recordDate = new Date(record.recordDate);
        return recordDate >= fourteenDaysAgo && recordDate < today && record.eggsCollected > 0;
      });

      if (recentProductionRecords.length > 0) {
        const avgDailyProduction = recentProductionRecords.reduce((sum, record) => 
          sum + (record.eggsCollected || 0), 0) / recentProductionRecords.length;

        const productionDrop = avgDailyProduction > 0 ? 
          ((avgDailyProduction - todayEggs) / avgDailyProduction) * 100 : 0;

        if (productionDrop > 30) {
          calculatedAlerts.push({
            id: "production-critical",
            type: "danger",
            icon: "trending-down",
            title: "Production Efficiency Critical",
            description: `Egg production dropped ${Math.round(productionDrop)}% below average (${todayEggs} vs ${Math.round(avgDailyProduction)}). Investigate immediately.`,
            priority: "High",
          });
        } else if (productionDrop > 15) {
          calculatedAlerts.push({
            id: "production-low", 
            type: "warning",
            icon: "trending-down",
            title: "Production Efficiency Drop",
            description: `Egg production down ${Math.round(productionDrop)}% from average (${todayEggs} vs ${Math.round(avgDailyProduction)}). Monitor closely.`,
            priority: "Medium",
          });
        }
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