import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useFarmContext } from "@/contexts/FarmContext";

interface SimpleMortalityFormProps {
  onSuccess?: () => void;
}

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

export default function SimpleMortalityForm({ onSuccess }: SimpleMortalityFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeFarmId, hasActiveFarm } = useFarmContext();

  // Form state
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);
  const [flockId, setFlockId] = useState("");
  const [mortalityCount, setMortalityCount] = useState("");
  const [mortalityReason, setMortalityReason] = useState("");
  const [notes, setNotes] = useState("");

  const { data: flocks = [] } = useQuery<any[]>({
    queryKey: ["/api/flocks"],
  });

  const createMortalityRecordMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Submitting mortality record:", data);
      await apiRequest("POST", "/api/daily-records", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/activity"] });
      toast({
        title: "Success",
        description: "Mortality record created successfully"
      });
      
      // Reset form
      setRecordDate(new Date().toISOString().split('T')[0]);
      setFlockId("");
      setMortalityCount("");
      setMortalityReason("");
      setNotes("");
      
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      console.error("Failed to create mortality record:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to record mortality. Please try again.",
        variant: "destructive"
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hasActiveFarm) {
      toast({
        title: "Farm Required",
        description: "Please select an active farm before submitting records.",
        variant: "destructive",
      });
      return;
    }
    
    if (!flockId) {
      toast({
        title: "Error",
        description: "Please select a flock",
        variant: "destructive"
      });
      return;
    }

    if (!mortalityCount || parseInt(mortalityCount) < 0) {
      toast({
        title: "Error",
        description: "Please enter valid mortality count",
        variant: "destructive"
      });
      return;
    }

    if (!mortalityReason) {
      toast({
        title: "Error",
        description: "Please select mortality reason",
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
      mortalityCount: parseInt(mortalityCount) || 0,
      mortalityReason,
      feedConsumed: null,
      feedType: null,
      temperature: null,
      lightingHours: null,
      averageWeight: null,
      sampleSize: 0,
      notes: notes.trim(),
      farmId: activeFarmId,
    };

    createMortalityRecordMutation.mutate(recordData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="flockId">Flock</Label>
        <Select value={flockId} onValueChange={setFlockId} required>
          <SelectTrigger data-testid="select-mortality-flock">
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

      <div className="space-y-2">
        <Label htmlFor="recordDate">Date</Label>
        <Input
          id="recordDate"
          type="date"
          value={recordDate}
          onChange={(e) => setRecordDate(e.target.value)}
          required
          data-testid="input-mortality-date"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="mortalityCount">Number of Birds Lost</Label>
        <Input
          id="mortalityCount"
          type="number"
          value={mortalityCount}
          onChange={(e) => setMortalityCount(e.target.value)}
          placeholder="2"
          required
          data-testid="input-mortality-count"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="mortalityReason">Reason for Loss</Label>
        <Select value={mortalityReason} onValueChange={setMortalityReason} required>
          <SelectTrigger data-testid="select-mortality-reason">
            <SelectValue placeholder="Select reason" />
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

      <div className="space-y-2">
        <Label htmlFor="notes">Additional Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional details about the mortality..."
          className="min-h-[80px]"
          data-testid="textarea-mortality-notes"
        />
      </div>

      <Button 
        type="submit" 
        className="w-full" 
        disabled={createMortalityRecordMutation.isPending}
        data-testid="button-submit-mortality"
      >
        {createMortalityRecordMutation.isPending ? "Recording..." : "Record Mortality"}
      </Button>
    </form>
  );
}