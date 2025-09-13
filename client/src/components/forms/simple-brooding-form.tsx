import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface SimpleBroodingFormProps {
  onSuccess?: () => void;
}

export default function SimpleBroodingForm({ onSuccess }: SimpleBroodingFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);
  const [flockId, setFlockId] = useState("");
  const [temperature, setTemperature] = useState("");
  const [lightingHours, setLightingHours] = useState("");
  const [mortalityCount, setMortalityCount] = useState("0");
  const [mortalityReason, setMortalityReason] = useState("");
  const [feedConsumed, setFeedConsumed] = useState("");
  const [feedType, setFeedType] = useState("");
  const [averageWeight, setAverageWeight] = useState("");
  const [sampleSize, setSampleSize] = useState("0");
  const [notes, setNotes] = useState("");

  const { data: flocks = [] } = useQuery<any[]>({
    queryKey: ["/api/flocks"],
  });

  // Calculate chick age and get suggestions based on selected flock and record date
  const selectedFlock = flocks.find(f => f.id === flockId);
  const baseDate = recordDate ? new Date(recordDate) : new Date();
  const chickAge = selectedFlock ? Math.max(0, Math.floor((baseDate.getTime() - new Date(selectedFlock.hatchDate).getTime()) / (1000 * 60 * 60 * 24))) : 0;
  const weekAge = Math.floor(chickAge / 7);

  // Age-based guidance
  const getTemperatureSuggestion = (age: number) => {
    if (age <= 7) return "35-32°C (Week 0-1)";
    if (age <= 21) return "32-29°C (Week 2-3)";
    if (age <= 35) return "29-26°C (Week 4-5)";
    if (age <= 56) return "26-21°C (Week 6-8)";
    return "21°C (Week 8+)";
  };

  const getLightingSuggestion = (age: number) => {
    if (age <= 7) return "24 hours (Week 0-1)";
    if (age <= 21) return "20 hours (Week 2-3)";
    if (age <= 35) return "16 hours (Week 4-5)";
    if (age <= 56) return "14 hours (Week 6-8)";
    return "12 hours (Week 8+)";
  };

  const getFeedSuggestion = (age: number, currentCount: number = 0) => {
    const gPerBirdPerDay = age <= 7 ? 15 : age <= 14 ? 25 : age <= 21 ? 35 : age <= 28 ? 45 : age <= 35 ? 55 : 65;
    const totalKg = (gPerBirdPerDay * currentCount) / 1000;
    return `~${totalKg.toFixed(1)}kg (${gPerBirdPerDay}g per bird/day)`;
  };

  const getWeightSuggestion = (age: number) => {
    if (age <= 7) return "35-45g (Week 0-1)";
    if (age <= 14) return "65-85g (Week 2)";
    if (age <= 21) return "120-150g (Week 3)";
    if (age <= 28) return "190-230g (Week 4)";
    if (age <= 35) return "270-320g (Week 5)";
    if (age <= 42) return "360-420g (Week 6)";
    if (age <= 49) return "450-520g (Week 7)";
    if (age <= 56) return "540-620g (Week 8)";
    return "620g+ (Week 8+)";
  };

  const createRecordMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/daily-records", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/activity"] });
      toast({
        title: "Success",
        description: "Brooding record created successfully",
      });
      resetForm();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create brooding record",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setRecordDate(new Date().toISOString().split('T')[0]);
    setFlockId("");
    setTemperature("");
    setLightingHours("");
    setMortalityCount("0");
    setMortalityReason("");
    setFeedConsumed("");
    setFeedType("");
    setAverageWeight("");
    setSampleSize("0");
    setNotes("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!flockId) {
      toast({
        title: "Error",
        description: "Please select a flock",
        variant: "destructive",
      });
      return;
    }

    if (!recordDate) {
      toast({
        title: "Error", 
        description: "Please select a record date",
        variant: "destructive",
      });
      return;
    }

    // Prepare data with proper type coercion - decimal fields need to be strings
    const payload = {
      recordDate,
      flockId,
      temperature: temperature || undefined, // Keep as string for decimal field
      lightingHours: lightingHours || undefined, // Keep as string for decimal field
      mortalityCount: parseInt(mortalityCount) || 0,
      mortalityReason: mortalityReason || undefined,
      feedConsumed: feedConsumed || undefined, // Keep as string for decimal field
      feedType: feedType || undefined,
      averageWeight: averageWeight || undefined, // Keep as string for decimal field
      sampleSize: parseInt(sampleSize) || 0,
      notes: notes || undefined,
      // Required egg production fields (defaults for brooding records)
      eggsCollected: 0,
      brokenEggs: 0,
      cratesProduced: 0,
    };

    console.log("Submitting brooding record:", payload);
    createRecordMutation.mutate(payload);
  };

  return (
    <Card data-testid="card-simple-brooding-form">
      <CardHeader>
        <CardTitle>Brooding Record</CardTitle>
        <CardDescription>
          Record daily brooding activities including temperature, lighting, feed consumption, and chick health.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="recordDate">Record Date</Label>
              <Input
                id="recordDate"
                type="date"
                value={recordDate}
                onChange={(e) => setRecordDate(e.target.value)}
                data-testid="input-record-date"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="flockId">Flock</Label>
              <Select value={flockId} onValueChange={setFlockId}>
                <SelectTrigger data-testid="select-flock">
                  <SelectValue placeholder="Select a flock" />
                </SelectTrigger>
                <SelectContent>
                  {flocks.map((flock: any) => {
                    const age = Math.floor((new Date().getTime() - new Date(flock.hatchDate).getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <SelectItem key={flock.id} value={flock.id}>
                        {flock.name} ({age} days old - Week {Math.floor(age / 7)})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {selectedFlock && (
                <p className="text-sm text-muted-foreground">
                  Selected flock is {chickAge} days old (Week {weekAge})
                </p>
              )}
            </div>
          </div>

          {/* Environment Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Environment Conditions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="temperature">Temperature (°C)</Label>
                <Input
                  id="temperature"
                  type="number"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  placeholder={selectedFlock ? getTemperatureSuggestion(chickAge) : "e.g., 32.5"}
                  data-testid="input-temperature"
                />
                {selectedFlock && (
                  <p className="text-xs text-muted-foreground">
                    Suggested: {getTemperatureSuggestion(chickAge)}
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
                  placeholder={selectedFlock ? getLightingSuggestion(chickAge) : "e.g., 18"}
                  data-testid="input-lighting-hours"
                />
                {selectedFlock && (
                  <p className="text-xs text-muted-foreground">
                    Suggested: {getLightingSuggestion(chickAge)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Mortality Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Mortality</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mortalityCount">Mortality Count</Label>
                <Input
                  id="mortalityCount"
                  type="number"
                  value={mortalityCount}
                  onChange={(e) => setMortalityCount(e.target.value)}
                  data-testid="input-mortality-count"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mortalityReason">Mortality Reason</Label>
                <Input
                  id="mortalityReason"
                  value={mortalityReason}
                  onChange={(e) => setMortalityReason(e.target.value)}
                  placeholder="e.g., Disease, Injury"
                  data-testid="input-mortality-reason"
                />
              </div>
            </div>
          </div>

          {/* Feed Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Feed</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="feedConsumed">Feed Consumed (kg)</Label>
                <Input
                  id="feedConsumed"
                  type="number"
                  step="0.01"
                  value={feedConsumed}
                  onChange={(e) => setFeedConsumed(e.target.value)}
                  placeholder={selectedFlock ? getFeedSuggestion(chickAge, selectedFlock.currentCount) : "e.g., 125.5"}
                  data-testid="input-feed-consumed"
                />
                {selectedFlock && (
                  <p className="text-xs text-muted-foreground">
                    Suggested: {getFeedSuggestion(chickAge, selectedFlock.currentCount)}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedType">Feed Type</Label>
                <Select value={feedType} onValueChange={setFeedType}>
                  <SelectTrigger data-testid="select-feed-type">
                    <SelectValue placeholder="Select feed type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chick-starter">Chick Starter</SelectItem>
                    <SelectItem value="broiler-starter">Broiler Starter</SelectItem>
                    <SelectItem value="chick-grower">Chick Grower</SelectItem>
                    <SelectItem value="medicated-starter">Medicated Starter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Weight Monitoring Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Weight Monitoring</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="averageWeight">Average Weight (g)</Label>
                <Input
                  id="averageWeight"
                  type="number"
                  step="0.1"
                  value={averageWeight}
                  onChange={(e) => setAverageWeight(e.target.value)}
                  placeholder={selectedFlock ? getWeightSuggestion(chickAge) : "e.g., 45.5"}
                  data-testid="input-average-weight"
                />
                {selectedFlock && (
                  <p className="text-xs text-muted-foreground">
                    Expected: {getWeightSuggestion(chickAge)}
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
                  data-testid="input-sample-size"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Any additional observations or notes..."
              data-testid="textarea-notes"
            />
          </div>

          <Button 
            type="submit" 
            disabled={createRecordMutation.isPending}
            data-testid="button-submit-brooding-record"
            className="w-full"
          >
            {createRecordMutation.isPending ? "Saving..." : "Save Brooding Record"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}