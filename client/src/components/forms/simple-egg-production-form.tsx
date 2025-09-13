import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface SimpleEggProductionFormProps {
  onSuccess?: () => void;
}

export default function SimpleEggProductionForm({ onSuccess }: SimpleEggProductionFormProps) {
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

  // Automatically calculate crates produced (30 eggs per crate)
  useEffect(() => {
    const eggs = parseInt(eggsCollected) || 0;
    const calculatedCrates = Math.floor(eggs / 30);
    setCratesProduced(calculatedCrates.toString());
  }, [eggsCollected]);

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
        description: "Egg production record created successfully",
      });
      resetForm();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create egg production record",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setRecordDate(new Date().toISOString().split('T')[0]);
    setFlockId("");
    setEggsCollected("");
    setBrokenEggs("");
    setCratesProduced("");
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

    // Prepare data focused only on egg production
    const payload = {
      recordDate,
      flockId,
      eggsCollected: parseInt(eggsCollected) || 0,
      brokenEggs: parseInt(brokenEggs) || 0,
      cratesProduced: parseInt(cratesProduced) || 0,
      notes: notes || undefined,
      // Set defaults for other required fields
      mortalityCount: 0,
      sampleSize: 0,
    };

    console.log("Submitting egg production record:", payload);
    createRecordMutation.mutate(payload);
  };

  return (
    <Card data-testid="card-simple-egg-production-form">
      <CardHeader>
        <CardTitle>Egg Production Record</CardTitle>
        <CardDescription>
          Record daily egg collection data including total eggs, broken eggs, and crates produced.
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
                  {flocks.map((flock: any) => (
                    <SelectItem key={flock.id} value={flock.id}>
                      {flock.name} ({flock.currentCount} birds)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Egg Production Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Egg Production</h3>
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
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Any observations about egg quality, collection issues, etc..."
              data-testid="textarea-notes"
            />
          </div>

          <Button 
            type="submit" 
            disabled={createRecordMutation.isPending}
            data-testid="button-submit-egg-production"
            className="w-full"
          >
            {createRecordMutation.isPending ? "Saving..." : "Save Egg Production Record"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}