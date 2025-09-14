import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface SimpleFlockFormProps {
  onSuccess?: () => void;
}

export default function SimpleFlockForm({ onSuccess }: SimpleFlockFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [initialCount, setInitialCount] = useState(0);
  const [hatchDate, setHatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState("brooding");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createFlockMutation = useMutation({
    mutationFn: async (flockData: any) => {
      console.log("Mutation function called with:", flockData);
      const response = await apiRequest("POST", "/api/flocks", flockData);
      console.log("API response:", response);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/flocks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      toast({
        title: "Success",
        description: "Flock created successfully",
      });
      // Reset form
      setName("");
      setBreed("");
      setInitialCount(0);
      setHatchDate(new Date().toISOString().split('T')[0]);
      setStatus("brooding");
      onSuccess?.();
    },
    onError: (error: any) => {
      console.error("Create flock error:", error);
      
      if (error.message?.includes("must be associated with a farm")) {
        toast({
          title: "Farm Registration Required",
          description: "You need to register your farm first. Go to /farm-registration to get started.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to create flock",
          variant: "destructive",
        });
      }
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    console.log("handleSubmit called!");
    e.preventDefault();
    console.log("Form data - name:", name, "breed:", breed, "initialCount:", initialCount);
    
    // Basic validation
    if (!name.trim()) {
      toast({
        title: "Validation Error",
        description: "Flock name is required",
        variant: "destructive",
      });
      return;
    }
    
    if (!breed) {
      toast({
        title: "Validation Error", 
        description: "Please select a breed",
        variant: "destructive",
      });
      return;
    }
    
    if (initialCount <= 0) {
      toast({
        title: "Validation Error",
        description: "Initial count must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    const flockData = {
      name: name.trim(),
      breed,
      initialCount,
      currentCount: initialCount,
      hatchDate,
      status,
    };

    console.log("Submitting flock data:", flockData);
    createFlockMutation.mutate(flockData);
  };

  return (
    <Card data-testid="card-simple-flock-form">
      <CardHeader>
        <CardTitle>Add New Flock</CardTitle>
        <CardDescription>
          Create a new flock for your poultry farm. Track this flock throughout its lifecycle.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Flock Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="e.g., Batch A 2024"
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="input-simple-flock-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="breed">Breed</Label>
              <Select value={breed} onValueChange={setBreed}>
                <SelectTrigger data-testid="select-simple-breed">
                  <SelectValue placeholder="Select breed" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rhode-island-red">Rhode Island Red</SelectItem>
                  <SelectItem value="leghorn">Leghorn</SelectItem>
                  <SelectItem value="sussex">Sussex</SelectItem>
                  <SelectItem value="plymouth-rock">Plymouth Rock</SelectItem>
                  <SelectItem value="new-hampshire">New Hampshire</SelectItem>
                  <SelectItem value="wyandotte">Wyandotte</SelectItem>
                  <SelectItem value="orpington">Orpington</SelectItem>
                  <SelectItem value="australorp">Australorp</SelectItem>
                  <SelectItem value="brahma">Brahma</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="initialCount">Initial Count</Label>
              <Input
                id="initialCount"
                type="number"
                placeholder="500"
                value={initialCount || ""}
                onChange={(e) => setInitialCount(parseInt(e.target.value) || 0)}
                data-testid="input-simple-initial-count"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hatchDate">Hatch Date</Label>
              <Input
                id="hatchDate"
                type="date"
                value={hatchDate}
                onChange={(e) => setHatchDate(e.target.value)}
                data-testid="input-simple-hatch-date"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger data-testid="select-simple-status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="brooding">Brooding</SelectItem>
                <SelectItem value="laying">Laying</SelectItem>
                <SelectItem value="retired">Retired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            type="submit" 
            disabled={createFlockMutation.isPending}
            data-testid="button-submit-simple-flock"
            className="w-full"
          >
            {createFlockMutation.isPending ? "Creating..." : "Create Flock"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}