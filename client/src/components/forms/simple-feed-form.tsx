import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface SimpleFeedFormProps {
  onSuccess?: () => void;
}

export default function SimpleFeedForm({ onSuccess }: SimpleFeedFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);
  const [flockId, setFlockId] = useState("");
  const [feedConsumed, setFeedConsumed] = useState("");
  const [feedType, setFeedType] = useState("");
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

  const createFeedRecordMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Submitting feed record:", data);
      await apiRequest("POST", "/api/daily-records", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/activity"] });
      toast({
        title: "Success",
        description: "Feed record updated successfully"
      });
      
      // Reset form
      setRecordDate(new Date().toISOString().split('T')[0]);
      setFlockId("");
      setFeedConsumed("");
      setFeedType("");
      setNotes("");
      
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      console.error("Failed to create feed record:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update feed record. Please try again.",
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

    if (!feedConsumed || parseFloat(feedConsumed) <= 0) {
      toast({
        title: "Error",
        description: "Please enter valid feed consumed amount",
        variant: "destructive"
      });
      return;
    }

    if (!feedType) {
      toast({
        title: "Error",
        description: "Please select feed type",
        variant: "destructive"
      });
      return;
    }

    const recordData = {
      recordDate,
      flockId,
      eggsCollected: 0,
      brokenEggs: 0,
      cratesProduced: 0,
      mortalityCount: 0,
      mortalityReason: null,
      feedConsumed,
      feedType,
      temperature: null,
      lightingHours: null,
      averageWeight: null,
      sampleSize: 0,
      notes: notes.trim(),
    };

    createFeedRecordMutation.mutate(recordData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="flockId">Flock</Label>
        <Select value={flockId} onValueChange={setFlockId} required>
          <SelectTrigger data-testid="select-feed-flock">
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

      {/* Age-based Guidance */}
      {selectedFlock && chickAge > 0 && (
        <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-green-800 dark:text-green-200">
              🌱 Day {chickAge} Feed Guidance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">Recommended</Badge>
                <span><strong>Type:</strong> {feedGuidance.feedType} ({feedGuidance.protein})</span>
              </div>
              <p><strong>Amount:</strong> {feedGuidance.dailyAmount}</p>
              <p><strong>For {selectedFlock.currentCount} birds:</strong> ~{Math.round(selectedFlock.currentCount * (chickAge <= 7 ? 0.02 : chickAge <= 14 ? 0.03 : chickAge <= 21 ? 0.045 : chickAge <= 28 ? 0.06 : chickAge <= 42 ? 0.075 : 0.12))}kg total</p>
              <div className="bg-green-100 dark:bg-green-900 p-2 rounded text-xs">
                <strong>💡 Tip:</strong> {feedGuidance.tips}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        <Label htmlFor="recordDate">Date</Label>
        <Input
          id="recordDate"
          type="date"
          value={recordDate}
          onChange={(e) => setRecordDate(e.target.value)}
          required
          data-testid="input-feed-date"
        />
      </div>

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
        <Select value={feedType} onValueChange={setFeedType} required>
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
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Feed quality, supplier, or other observations..."
          className="min-h-[60px]"
          data-testid="textarea-feed-notes"
        />
      </div>

      <Button 
        type="submit" 
        className="w-full" 
        disabled={createFeedRecordMutation.isPending}
        data-testid="button-submit-feed"
      >
        {createFeedRecordMutation.isPending ? "Updating..." : "Update Feed Record"}
      </Button>
    </form>
  );
}