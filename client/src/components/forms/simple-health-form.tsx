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
  const [dosage, setDosage] = useState("");
  const [administeredBy, setAdministeredBy] = useState("");
  const [nextDueDate, setNextDueDate] = useState("");
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
      setDosage("");
      setAdministeredBy("");
      setNextDueDate("");
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
      dosage: dosage.trim() || undefined,
      administeredBy: administeredBy.trim() || undefined,
      nextDueDate: nextDueDate || undefined,
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="medicationUsed">Medication/Vaccine</Label>
          <Select value={medicationUsed} onValueChange={setMedicationUsed}>
            <SelectTrigger data-testid="select-health-medication">
              <SelectValue placeholder="Select vaccine/medication" />
            </SelectTrigger>
            <SelectContent className="max-h-60 overflow-y-auto">
              <SelectItem value="custom">Custom/Other</SelectItem>
              
              {/* Day 1 Vaccines */}
              <SelectItem value="Marek's MD/IBD">Marek's MD/IBD</SelectItem>
              <SelectItem value="Rismavac">Rismavac</SelectItem>
              <SelectItem value="NCD+IB Live (Vitabron)">NCD+IB Live (Vitabron)</SelectItem>
              
              {/* Day 12-14 Vaccines */}
              <SelectItem value="NCD+IB Live (Ceva BiJI)">NCD+IB Live (Ceva BiJI)</SelectItem>
              
              {/* Day 16-18 Vaccines */}
              <SelectItem value="IBD Intermediate">IBD Intermediate</SelectItem>
              
              {/* Week 6-8 Vaccines */}
              <SelectItem value="Salmonella E&T">Salmonella E&T</SelectItem>
              <SelectItem value="Coryza (ABC) Killed">Coryza (ABC) Killed</SelectItem>
              
              {/* Week 8-10 Vaccines */}
              <SelectItem value="Fowl pox">Fowl pox</SelectItem>
              <SelectItem value="Fowl cholera">Fowl cholera</SelectItem>
              
              {/* Week 12-14 Vaccines */}
              <SelectItem value="Salmonella E&T (killed)">Salmonella E&T (killed)</SelectItem>
              <SelectItem value="Coryza (ABC) killed">Coryza (ABC) killed</SelectItem>
              
              {/* Week 16-18 Vaccines */}
              <SelectItem value="NCD+IB (Killed)">NCD+IB (Killed)</SelectItem>
              
              {/* Common Medications */}
              <SelectItem value="Antibiotics">Antibiotics</SelectItem>
              <SelectItem value="Vitamins">Vitamins</SelectItem>
              <SelectItem value="Dewormers">Dewormers</SelectItem>
              <SelectItem value="Probiotics">Probiotics</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dosage">Dosage/Application Method</Label>
          <Select value={dosage} onValueChange={setDosage}>
            <SelectTrigger data-testid="select-health-dosage">
              <SelectValue placeholder="Select application method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="S/C injection">S/C injection (Subcutaneous)</SelectItem>
              <SelectItem value="Intramuscular injection">Intramuscular injection</SelectItem>
              <SelectItem value="Eye drop/Drinking water">Eye drop/Drinking water</SelectItem>
              <SelectItem value="Drinking water">Drinking water</SelectItem>
              <SelectItem value="Coarse spray">Coarse spray</SelectItem>
              <SelectItem value="Wing stab">Wing stab</SelectItem>
              <SelectItem value="Subcutaneous injection">Subcutaneous injection</SelectItem>
              <SelectItem value="Oral">Oral</SelectItem>
              <SelectItem value="Feed mixing">Feed mixing</SelectItem>
              <SelectItem value="Topical">Topical</SelectItem>
              <SelectItem value="Custom">Custom/Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="administeredBy">Administered By</Label>
        <Input
          id="administeredBy"
          placeholder="Veterinarian or staff name"
          value={administeredBy}
          onChange={(e) => setAdministeredBy(e.target.value)}
          data-testid="input-health-administered-by"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="nextDueDate">Next Due Date</Label>
        <Input
          id="nextDueDate"
          type="date"
          value={nextDueDate}
          onChange={(e) => setNextDueDate(e.target.value)}
          data-testid="input-health-next-due-date"
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