import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { Egg, Skull, Wheat, Thermometer, Sun, Weight } from "lucide-react";

interface ComprehensiveDailyRecordFormProps {
  onSuccess?: () => void;
}

export default function ComprehensiveDailyRecordForm({ onSuccess }: ComprehensiveDailyRecordFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);
  const [flockId, setFlockId] = useState("");
  
  // Egg production
  const [eggsCollected, setEggsCollected] = useState("");
  const [brokenEggs, setBrokenEggs] = useState("");
  const [cratesProduced, setCratesProduced] = useState("");

  // Mortality
  const [mortalityCount, setMortalityCount] = useState("");
  const [mortalityReason, setMortalityReason] = useState("");
  
  // Feed
  const [feedConsumed, setFeedConsumed] = useState("");
  const [feedType, setFeedType] = useState("");
  
  // Brooding (optional)
  const [temperature, setTemperature] = useState("");
  const [lightingHours, setLightingHours] = useState("");
  const [averageWeight, setAverageWeight] = useState("");
  const [sampleSize, setSampleSize] = useState("");
  
  const [notes, setNotes] = useState("");

  const { data: flocks = [] } = useQuery<any[]>({
    queryKey: ["/api/flocks"],
  });

  // Calculate chick age and get guidance
  const getChickAge = (recordDate: string, hatchDate: string) => {
    const record = new Date(recordDate);
    const hatch = new Date(hatchDate);
    const diffTime = record.getTime() - hatch.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const selectedFlock = flocks.find(f => f.id === flockId);
  const chickAge = selectedFlock ? getChickAge(recordDate, selectedFlock.hatchDate) : 0;

  // Age-based feed guidance
  const getFeedGuidance = (age: number) => {
    if (age <= 7) return {
      feedType: "chick-starter",
      dailyAmount: "15-20g per chick",
      protein: "24% protein",
      tips: "Critical growth period - ensure continuous access to feed"
    };
    if (age <= 14) return {
      feedType: "chick-starter", 
      dailyAmount: "25-35g per chick",
      protein: "24% protein",
      tips: "Monitor feed intake closely, increase as birds grow"
    };
    if (age <= 21) return {
      feedType: "chick-starter",
      dailyAmount: "40-50g per chick", 
      protein: "20-22% protein",
      tips: "Transitioning period - can start mixing with grower feed"
    };
    if (age <= 28) return {
      feedType: "grower-feed",
      dailyAmount: "55-65g per chick",
      protein: "18-20% protein", 
      tips: "Key development phase - maintain consistent feeding schedule"
    };
    if (age <= 42) return {
      feedType: "grower-feed",
      dailyAmount: "70-85g per bird",
      protein: "16-18% protein",
      tips: "Pre-laying preparation - monitor body condition"
    };
    return {
      feedType: "layer-feed",
      dailyAmount: "110-130g per bird", 
      protein: "16-18% protein",
      tips: "Peak production - consistent high-quality nutrition required"
    };
  };

  const feedGuidance = getFeedGuidance(chickAge);

  // Automatic crate calculation
  useEffect(() => {
    const eggs = parseInt(eggsCollected) || 0;
    const calculatedCrates = Math.floor(eggs / 30);
    setCratesProduced(calculatedCrates.toString());
  }, [eggsCollected]);

  // Mortality reasons list
  const mortalityReasons = [
    { value: "disease", label: "Disease/Illness" },
    { value: "predator", label: "Predator Attack" },
    { value: "accident", label: "Accident/Injury" }, 
    { value: "heat-stress", label: "Heat Stress" },
    { value: "cold-stress", label: "Cold Stress" },
    { value: "feed-related", label: "Feed Related" },
    { value: "water-related", label: "Water Related" },
    { value: "old-age", label: "Old Age" },
    { value: "cannibalism", label: "Cannibalism/Pecking" },
    { value: "unknown", label: "Unknown Cause" },
    { value: "other", label: "Other" }
  ];

  const createRecordMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Submitting comprehensive daily record:", data);
      await apiRequest("POST", "/api/daily-records", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/activity"] });
      toast({
        title: "Success",
        description: "Daily record saved successfully"
      });
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      console.error("Failed to create daily record:", error);
      toast({
        title: "Error", 
        description: error.message || "Failed to save daily record. Please try again.",
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
      // Egg production
      eggsCollected: parseInt(eggsCollected) || 0,
      brokenEggs: parseInt(brokenEggs) || 0,
      cratesProduced: parseInt(cratesProduced) || 0,
      // Mortality  
      mortalityCount: parseInt(mortalityCount) || 0,
      mortalityReason: mortalityReason || null,
      // Feed
      feedConsumed: feedConsumed || null,
      feedType: feedType || null,
      // Brooding (optional)
      temperature: temperature || null,
      lightingHours: lightingHours || null,
      averageWeight: averageWeight || null,
      sampleSize: parseInt(sampleSize) || 0,
      notes,
    };

    createRecordMutation.mutate(recordData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📋 Daily Record Information
          </CardTitle>
          <CardDescription>Select date and flock for this record</CardDescription>
        </CardHeader>
        <CardContent>
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
                      {flock.name} ({flock.currentCount} birds) - Day {getChickAge(recordDate, flock.hatchDate)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Age-based Guidance */}
      {selectedFlock && chickAge > 0 && (
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-blue-800 dark:text-blue-200">
              🧭 Day {chickAge} Guidance
            </CardTitle>
            <CardDescription className="text-blue-600 dark:text-blue-300">
              Age-based recommendations for {selectedFlock.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="space-y-2">
                <Badge variant="secondary">Feed Guidance</Badge>
                <p><strong>Type:</strong> {feedGuidance.feedType}</p>
                <p><strong>Amount:</strong> {feedGuidance.dailyAmount}</p>
                <p><strong>Protein:</strong> {feedGuidance.protein}</p>
              </div>
              <div className="space-y-2">
                <Badge variant="secondary">Pro Tips</Badge>
                <p className="text-xs">{feedGuidance.tips}</p>
              </div>
              <div className="space-y-2">
                <Badge variant="secondary">Expected Weight</Badge>
                <p>{chickAge <= 7 ? "120-150g" : chickAge <= 14 ? "200-250g" : chickAge <= 21 ? "300-350g" : chickAge <= 28 ? "400-450g" : chickAge <= 42 ? "1000-1200g" : "1500-1800g"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Egg Production Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Egg className="h-5 w-5" />
            Egg Production
          </CardTitle>
          <CardDescription>Daily egg collection and quality data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="eggsCollected">Eggs Collected</Label>
              <Input
                id="eggsCollected"
                type="number"
                value={eggsCollected}
                onChange={(e) => setEggsCollected(e.target.value)}
                placeholder="0"
                data-testid="input-eggs-collected"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brokenEggs">Broken Eggs</Label>
              <Input
                id="brokenEggs"
                type="number"
                value={brokenEggs}
                onChange={(e) => setBrokenEggs(e.target.value)}
                placeholder="0"
                data-testid="input-broken-eggs"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cratesProduced">Crates Produced</Label>
              <Input
                id="cratesProduced"
                type="number"
                value={cratesProduced}
                readOnly
                className="bg-muted"
                placeholder="Auto-calculated"
                data-testid="input-crates-produced"
              />
              <p className="text-xs text-muted-foreground">
                Auto-calculated: 30 eggs = 1 crate
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mortality Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Skull className="h-5 w-5" />
            Mortality Tracking
          </CardTitle>
          <CardDescription>Record any bird losses and reasons</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mortalityCount">Birds Lost</Label>
              <Input
                id="mortalityCount"
                type="number"
                value={mortalityCount}
                onChange={(e) => setMortalityCount(e.target.value)}
                placeholder="0"
                data-testid="input-mortality-count"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mortalityReason">Reason for Loss</Label>
              <Select value={mortalityReason} onValueChange={setMortalityReason}>
                <SelectTrigger data-testid="select-mortality-reason">
                  <SelectValue placeholder="Select reason (if any)" />
                </SelectTrigger>
                <SelectContent>
                  {mortalityReasons.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feed Management Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wheat className="h-5 w-5" />
            Feed Management
          </CardTitle>
          <CardDescription>Daily feed consumption and type with age-based guidance</CardDescription>
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
                data-testid="input-feed-consumed"
              />
              {selectedFlock && chickAge > 0 && (
                <div className="text-xs text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-950 p-2 rounded">
                  <p><strong>Recommended:</strong> {feedGuidance.dailyAmount}</p>
                  <p><strong>For {selectedFlock.currentCount} birds:</strong> ~{Math.round(selectedFlock.currentCount * (chickAge <= 7 ? 0.02 : chickAge <= 14 ? 0.03 : chickAge <= 21 ? 0.045 : chickAge <= 28 ? 0.06 : chickAge <= 42 ? 0.075 : 0.12))}kg total</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedType">Feed Type</Label>
              <Select value={feedType} onValueChange={setFeedType}>
                <SelectTrigger data-testid="select-feed-type">
                  <SelectValue placeholder="Select feed type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="chick-starter">Chick Starter (24% protein)</SelectItem>
                  <SelectItem value="chick-grower">Chick Grower (20% protein)</SelectItem>
                  <SelectItem value="grower-feed">Grower Feed (18% protein)</SelectItem>
                  <SelectItem value="developer">Developer Feed (16-18% protein)</SelectItem>
                  <SelectItem value="layer-feed">Layer Feed (16% protein)</SelectItem>
                  <SelectItem value="layer-mash">Layer Mash</SelectItem>
                  <SelectItem value="layer-pellets">Layer Pellets</SelectItem>
                  <SelectItem value="wheat">Wheat</SelectItem>
                  <SelectItem value="maize">Maize</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {selectedFlock && chickAge > 0 && (
                <div className="text-xs text-green-600 dark:text-green-300 bg-green-50 dark:bg-green-950 p-2 rounded">
                  <p><strong>Age-recommended:</strong> {feedGuidance.feedType} ({feedGuidance.protein})</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Environmental Conditions (Optional) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Thermometer className="h-5 w-5" />
            Environmental Conditions (Optional)
          </CardTitle>
          <CardDescription>Temperature, lighting, and weight tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="temperature">Temperature (°C)</Label>
              <Input
                id="temperature"
                type="number"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                placeholder="24.5"
                data-testid="input-temperature"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lightingHours">Lighting Hours</Label>
              <Input
                id="lightingHours"
                type="number"
                step="0.5"
                value={lightingHours}
                onChange={(e) => setLightingHours(e.target.value)}
                placeholder="14.0"
                data-testid="input-lighting-hours"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="averageWeight">Average Weight (g)</Label>
              <Input
                id="averageWeight"
                type="number"
                step="0.1"
                value={averageWeight}
                onChange={(e) => setAverageWeight(e.target.value)}
                placeholder="1650.0"
                data-testid="input-average-weight"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sampleSize">Sample Size</Label>
              <Input
                id="sampleSize"
                type="number"
                value={sampleSize}
                onChange={(e) => setSampleSize(e.target.value)}
                placeholder="50"
                data-testid="input-sample-size"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes & Observations</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any observations, concerns, or special notes about today's activities..."
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
        {createRecordMutation.isPending ? "Saving Daily Record..." : "Save Daily Record"}
      </Button>
    </form>
  );
}