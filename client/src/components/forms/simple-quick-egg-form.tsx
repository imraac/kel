import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface SimpleQuickEggFormProps {
  onSuccess?: () => void;
}

export default function SimpleQuickEggForm({ onSuccess }: SimpleQuickEggFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);
  const [flockId, setFlockId] = useState("");
  const [eggsCollected, setEggsCollected] = useState("");
  const [brokenEggs, setBrokenEggs] = useState("");
  const [cratesProduced, setCratesProduced] = useState("");
  const [notes, setNotes] = useState("");

  const { data: flocks = [] } = useQuery<any[]>({
    queryKey: ["/api/flocks"],
  });

  // Auto-calculate crates produced
  useEffect(() => {
    const eggs = parseInt(eggsCollected) || 0;
    const calculatedCrates = Math.floor(eggs / 30);
    setCratesProduced(calculatedCrates.toString());
  }, [eggsCollected]);

  const createEggRecordMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Submitting quick egg record:", data);
      await apiRequest("POST", "/api/daily-records", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/activity"] });
      toast({
        title: "Success",
        description: "Egg collection recorded successfully"
      });
      
      // Reset form
      setRecordDate(new Date().toISOString().split('T')[0]);
      setFlockId("");
      setEggsCollected("");
      setBrokenEggs("");
      setCratesProduced("");
      setNotes("");
      
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      console.error("Failed to create egg record:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to record eggs. Please try again.",
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

    if (!eggsCollected || parseInt(eggsCollected) < 0) {
      toast({
        title: "Error",
        description: "Please enter valid number of eggs collected",
        variant: "destructive"
      });
      return;
    }

    const recordData = {
      recordDate,
      flockId,
      eggsCollected: parseInt(eggsCollected) || 0,
      brokenEggs: parseInt(brokenEggs) || 0,
      cratesProduced: parseInt(cratesProduced) || 0,
      mortalityCount: 0,
      mortalityReason: null,
      feedConsumed: null,
      feedType: null,
      temperature: null,
      lightingHours: null,
      averageWeight: null,
      sampleSize: 0,
      notes: notes.trim(),
    };

    createEggRecordMutation.mutate(recordData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="flockId">Flock</Label>
        <Select value={flockId} onValueChange={setFlockId} required>
          <SelectTrigger data-testid="select-quick-egg-flock">
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
          data-testid="input-egg-date"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="eggsCollected">Eggs Collected</Label>
        <Input
          id="eggsCollected"
          type="number"
          value={eggsCollected}
          onChange={(e) => setEggsCollected(e.target.value)}
          placeholder="150"
          required
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
          placeholder="5"
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

      <div className="space-y-2">
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Input
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any observations about today's collection"
          data-testid="input-egg-notes"
        />
      </div>

      <Button 
        type="submit" 
        className="w-full" 
        disabled={createEggRecordMutation.isPending}
        data-testid="button-submit-eggs"
      >
        {createEggRecordMutation.isPending ? "Recording..." : "Record Eggs"}
      </Button>
    </form>
  );
}