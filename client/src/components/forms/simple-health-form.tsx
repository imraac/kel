import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface SimpleHealthFormProps {
  onSuccess?: () => void;
}

export default function SimpleHealthForm({ onSuccess }: SimpleHealthFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);
  const [flockId, setFlockId] = useState("");
  const [recordType, setRecordType] = useState("vaccination");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [medicationUsed, setMedicationUsed] = useState("");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");

  const { data: flocks = [] } = useQuery<any[]>({
    queryKey: ["/api/flocks"],
  });

  const createHealthMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Submitting health record:", data);
      await apiRequest("POST", "/api/health-records", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/health-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/activity"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      toast({
        title: "Success",
        description: "Health record added successfully"
      });
      
      // Reset form
      setRecordDate(new Date().toISOString().split('T')[0]);
      setFlockId("");
      setRecordType("vaccination");
      setTitle("");
      setDescription("");
      setMedicationUsed("");
      setCost("");
      setNotes("");
      
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      console.error("Failed to create health record:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add health record. Please try again.",
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

    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a title",
        variant: "destructive"
      });
      return;
    }

    const healthData = {
      recordDate,
      flockId,
      recordType,
      title: title.trim(),
      description: description.trim(),
      medicationUsed: medicationUsed.trim() || undefined,
      dosage: undefined,
      administeredBy: undefined,
      nextDueDate: undefined,
      cost: cost.trim() || undefined,
      notes: notes.trim(),
    };

    createHealthMutation.mutate(healthData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="recordDate">Date</Label>
          <Input
            id="recordDate"
            type="date"
            value={recordDate}
            onChange={(e) => setRecordDate(e.target.value)}
            required
            data-testid="input-health-date"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="flockId">Flock</Label>
          <Select value={flockId} onValueChange={setFlockId} required>
            <SelectTrigger data-testid="select-health-flock">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="recordType">Type</Label>
          <Select value={recordType} onValueChange={setRecordType}>
            <SelectTrigger data-testid="select-health-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vaccination">Vaccination</SelectItem>
              <SelectItem value="medication">Medication</SelectItem>
              <SelectItem value="treatment">Treatment</SelectItem>
              <SelectItem value="checkup">Health Checkup</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cost">Cost (KSh)</Label>
          <Input
            id="cost"
            type="number"
            placeholder="0.00"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            data-testid="input-health-cost"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          placeholder="e.g., Newcastle vaccination, Routine checkup"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          data-testid="input-health-title"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Brief description of the health event"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          data-testid="textarea-health-description"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="medicationUsed">Medication/Vaccine Used</Label>
        <Input
          id="medicationUsed"
          placeholder="e.g., Newcastle vaccine, Amoxicillin"
          value={medicationUsed}
          onChange={(e) => setMedicationUsed(e.target.value)}
          data-testid="input-health-medication"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Additional notes or observations"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          data-testid="textarea-health-notes"
        />
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={createHealthMutation.isPending}
        data-testid="button-submit-health"
      >
        {createHealthMutation.isPending ? "Adding..." : "Add Health Record"}
      </Button>
    </form>
  );
}