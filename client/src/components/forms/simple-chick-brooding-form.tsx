import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

interface SimpleChickBroodingFormProps {
  onSuccess?: () => void;
}

export default function SimpleChickBroodingForm({ onSuccess }: SimpleChickBroodingFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);
  const [flockId, setFlockId] = useState("");
  const [temperature, setTemperature] = useState("");
  const [lightingHours, setLightingHours] = useState("18");
  const [feedConsumed, setFeedConsumed] = useState("");
  const [feedType, setFeedType] = useState("chick-starter");
  const [averageWeight, setAverageWeight] = useState("");
  const [sampleSize, setSampleSize] = useState("100");
  const [mortalityCount, setMortalityCount] = useState("0");
  const [notes, setNotes] = useState("");

  const { data: flocks = [] } = useQuery<any[]>({
    queryKey: ["/api/flocks"],
  });

  // Calculate chick age from selected date and flock hatch date
  const getChickAge = (recordDate: string, hatchDate: string) => {
    const record = new Date(recordDate);
    const hatch = new Date(hatchDate);
    const diffTime = record.getTime() - hatch.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const selectedFlock = flocks.find(f => f.id === flockId);
  const chickAge = selectedFlock ? getChickAge(recordDate, selectedFlock.hatchDate) : 0;

  // Get age-based guidance
  const getAgeGuidance = (age: number) => {
    if (age <= 7) return {
      category: "Week 1: Critical Care",
      tempRange: "32-35°C",
      lighting: "24 hours",
      feedType: "Chick Starter (24% protein)",
      feedAmount: "15-20g per chick",
      expectedWeight: "120-150g",
      tips: "Watch for pasty bottom, ensure access to water, check temperature frequently"
    };
    if (age <= 14) return {
      category: "Week 2: Stabilization", 
      tempRange: "29-32°C",
      lighting: "20-22 hours",
      feedType: "Chick Starter (24% protein)",
      feedAmount: "25-35g per chick", 
      expectedWeight: "200-250g",
      tips: "Reduce temperature gradually, monitor feed intake, watch for pecking"
    };
    if (age <= 21) return {
      category: "Week 3: Development",
      tempRange: "26-29°C", 
      lighting: "18-20 hours",
      feedType: "Chick Starter (20-22% protein)",
      feedAmount: "40-50g per chick",
      expectedWeight: "300-350g",
      tips: "Increase space allowance, start feather development monitoring"
    };
    if (age <= 28) return {
      category: "Week 4: Growth",
      tempRange: "23-26°C",
      lighting: "16-18 hours", 
      feedType: "Grower Feed (18-20% protein)",
      feedAmount: "55-65g per chick",
      expectedWeight: "400-450g",
      tips: "Monitor for uniform growth, adjust feeding schedule"
    };
    if (age <= 42) return {
      category: "Weeks 5-6: Pre-laying",
      tempRange: "21-24°C",
      lighting: "14-16 hours",
      feedType: "Grower/Developer Feed (16-18% protein)",
      feedAmount: "70-85g per bird",
      expectedWeight: "1000-1200g",
      tips: "Prepare for laying phase, monitor body condition"
    };
    return {
      category: "Laying Phase",
      tempRange: "18-24°C", 
      lighting: "14-16 hours",
      feedType: "Layer Feed (16-18% protein)",
      feedAmount: "110-130g per bird",
      expectedWeight: "1500-1800g",
      tips: "Monitor egg production, maintain consistent environment"
    };
  };

  const guidance = getAgeGuidance(chickAge);

  const createRecordMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Submitting chick brooding record:", data);
      await apiRequest("POST", "/api/daily-records", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/activity"] });
      toast({
        title: "Success",
        description: "Chick brooding record saved successfully"
      });
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      console.error("Failed to create brooding record:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save brooding record. Please try again.",
        variant: "destructive"
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!flockId) {
      toast({
        title: "Error",
        description: "Please select a flock",
        variant: "destructive"
      });
      return;
    }

    const recordData = {
      recordDate,
      flockId,
      temperature,
      lightingHours,
      feedConsumed,
      feedType,
      averageWeight,
      sampleSize: parseInt(sampleSize) || 0,
      mortalityCount: parseInt(mortalityCount) || 0,
      eggsCollected: 0, // Not applicable for brooding
      brokenEggs: 0, // Not applicable for brooding  
      cratesProduced: 0, // Not applicable for brooding
      notes,
    };

    createRecordMutation.mutate(recordData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Record Date & Flock Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="recordDate">Record Date</Label>
          <Input
            id="recordDate"
            type="date"
            value={recordDate}
            onChange={(e) => setRecordDate(e.target.value)}
            required
            data-testid="input-record-date"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="flockId">Flock</Label>
          <Select value={flockId} onValueChange={setFlockId} required>
            <SelectTrigger data-testid="select-flock">
              <SelectValue placeholder="Select flock" />
            </SelectTrigger>
            <SelectContent>
              {flocks.map((flock) => (
                <SelectItem key={flock.id} value={flock.id}>
                  {flock.name} ({flock.currentCount} birds)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Age-based Guidance Section */}
      {selectedFlock && chickAge > 0 && (
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-blue-800 dark:text-blue-200">
              📋 Day {chickAge} Guidance: {guidance.category}
            </CardTitle>
            <CardDescription className="text-blue-600 dark:text-blue-300">
              Chick age calculated from {format(new Date(selectedFlock.hatchDate), 'MMM d, yyyy')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p><strong>🌡️ Temperature:</strong> {guidance.tempRange}</p>
                <p><strong>💡 Lighting:</strong> {guidance.lighting}</p>
              </div>
              <div>
                <p><strong>🍽️ Feed:</strong> {guidance.feedType}</p>
                <p><strong>📊 Expected Weight:</strong> {guidance.expectedWeight}</p>
              </div>
            </div>
            <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-lg">
              <p className="text-sm"><strong>💡 Pro Tip:</strong> {guidance.tips}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Brooding Environment */}
      <Card>
        <CardHeader>
          <CardTitle>Brooding Environment</CardTitle>
          <CardDescription>Temperature and lighting conditions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="temperature">Temperature (°C)</Label>
              <Input
                id="temperature"
                type="number"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                placeholder="32.5"
                required
                data-testid="input-temperature"
              />
              {guidance.tempRange && (
                <p className="text-xs text-muted-foreground">
                  Recommended: {guidance.tempRange}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lightingHours">Lighting Hours</Label>
              <Input
                id="lightingHours"
                type="number"
                step="0.5"
                value={lightingHours}
                onChange={(e) => setLightingHours(e.target.value)}
                placeholder="18.0"
                required
                data-testid="input-lighting-hours"
              />
              {guidance.lighting && (
                <p className="text-xs text-muted-foreground">
                  Recommended: {guidance.lighting}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feed Management */}
      <Card>
        <CardHeader>
          <CardTitle>Feed Management</CardTitle>
          <CardDescription>Daily feed consumption and type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="feedConsumed">Feed Consumed (kg)</Label>
              <Input
                id="feedConsumed"
                type="number"
                step="0.1"
                value={feedConsumed}
                onChange={(e) => setFeedConsumed(e.target.value)}
                placeholder="150.0"
                required
                data-testid="input-feed-consumed"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedType">Feed Type</Label>
              <Select value={feedType} onValueChange={setFeedType}>
                <SelectTrigger data-testid="select-feed-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="chick-starter">Chick Starter (24% protein)</SelectItem>
                  <SelectItem value="chick-grower">Chick Grower (20% protein)</SelectItem>
                  <SelectItem value="developer">Developer Feed (16-18% protein)</SelectItem>
                  <SelectItem value="layer-starter">Layer Starter</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {guidance.feedType && (
                <p className="text-xs text-muted-foreground">
                  Recommended: {guidance.feedType}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weight & Health Monitoring */}
      <Card>
        <CardHeader>
          <CardTitle>Weight & Health Monitoring</CardTitle>
          <CardDescription>Growth tracking and mortality records</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="averageWeight">Average Weight (g)</Label>
              <Input
                id="averageWeight"
                type="number"
                step="0.1"
                value={averageWeight}
                onChange={(e) => setAverageWeight(e.target.value)}
                placeholder="265.0"
                required
                data-testid="input-average-weight"
              />
              {guidance.expectedWeight && (
                <p className="text-xs text-muted-foreground">
                  Expected: {guidance.expectedWeight}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sampleSize">Sample Size</Label>
              <Input
                id="sampleSize"
                type="number"
                value={sampleSize}
                onChange={(e) => setSampleSize(e.target.value)}
                placeholder="100"
                required
                data-testid="input-sample-size"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mortalityCount">Mortality Count</Label>
              <Input
                id="mortalityCount"
                type="number"
                value={mortalityCount}
                onChange={(e) => setMortalityCount(e.target.value)}
                placeholder="0"
                data-testid="input-mortality-count"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any observations, concerns, or special notes..."
          className="min-h-[100px]"
          data-testid="textarea-notes"
        />
      </div>

      <Separator />

      <Button 
        type="submit" 
        className="w-full" 
        disabled={createRecordMutation.isPending}
        data-testid="button-submit"
      >
        {createRecordMutation.isPending ? "Saving..." : "Save Brooding Record"}
      </Button>
    </form>
  );
}