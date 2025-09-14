import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertFlockSchema } from "@shared/schema";
import { z } from "zod";

// Create a simple form schema that works with string inputs
const flockFormSchema = z.object({
  name: z.string().min(1, "Flock name is required"),
  breed: z.string().min(1, "Breed is required"),
  initialCount: z.number().min(1, "Initial count must be at least 1"),
  currentCount: z.number().min(0, "Current count must be at least 0"),
  hatchDate: z.string().min(1, "Hatch date is required"),
  status: z.enum(["brooding", "laying", "retired"]),
  farmId: z.string().optional(), // Optional for validation, included for editing
});

type FlockFormInputs = z.infer<typeof flockFormSchema>;

interface FlockFormProps {
  flock?: any; // For editing existing flock
  onSuccess?: () => void;
}

export default function FlockForm({ flock, onSuccess }: FlockFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FlockFormInputs>({
    resolver: zodResolver(flockFormSchema),
    defaultValues: {
      name: flock?.name || "",
      breed: flock?.breed || "",
      initialCount: flock?.initialCount || 0,
      currentCount: flock?.currentCount || 0,
      hatchDate: flock?.hatchDate ? new Date(flock.hatchDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      status: flock?.status || "brooding",
      farmId: flock?.farmId || "", // Include farmId for validation (backend will strip it out)
    },
  });

  const saveFlockMutation = useMutation({
    mutationFn: async (data: FlockFormInputs) => {
      console.log("Mutation function called with data:", data);
      
      if (flock) {
        // Editing existing flock - transform data to match backend expectations
        const flockData = {
          name: data.name,
          breed: data.breed,
          initialCount: data.initialCount,
          currentCount: data.currentCount,
          hatchDate: new Date(data.hatchDate), // Transform string to Date
          status: data.status,
        };
        console.log("Making PUT request to:", `/api/flocks/${flock.id}`);
        const response = await apiRequest("PUT", `/api/flocks/${flock.id}`, flockData);
        console.log("PUT response:", response);
        
        // Check for silent errors by status
        if (!response) {
          throw new Error('Update failed: No response received');
        }
        
        return response;
      } else {
        // Creating new flock - transform data to match backend expectations
        const flockData = {
          name: data.name,
          breed: data.breed,
          initialCount: data.initialCount,
          currentCount: data.initialCount, // Set current count to initial count for new flocks
          hatchDate: new Date(data.hatchDate), // Transform string to Date
          status: data.status,
        };
        console.log("Making POST request with data:", flockData);
        const response = await apiRequest("POST", "/api/flocks", flockData);
        console.log("POST response:", response);
        return response;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/flocks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      toast({
        title: "Success",
        description: flock ? "Flock updated successfully" : "Flock created successfully",
      });
      if (!flock) {
        form.reset();
      }
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || (flock ? "Failed to update flock" : "Failed to create flock"),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FlockFormInputs) => {
    console.log("🚀 FORM SUBMIT CALLED!", {
      data,
      formErrors: form.formState.errors,
      isValid: form.formState.isValid,
      isEditing: !!flock,
      flockId: flock?.id,
      mutationState: {
        isPending: saveFlockMutation.isPending,
        isError: saveFlockMutation.isError,
        error: saveFlockMutation.error
      }
    });
    
    // Check if form has validation errors
    if (!form.formState.isValid) {
      console.log("❌ FORM VALIDATION FAILED:", form.formState.errors);
      return;
    }
    
    try {
      console.log("🔄 TRIGGERING MUTATION...");
      saveFlockMutation.mutate(data);
    } catch (error) {
      console.error("❌ ERROR IN MUTATION:", error);
    }
  };

  return (
    <Card data-testid="card-flock-form">
      <CardHeader>
        <CardTitle>{flock ? "Edit Flock" : "Add New Flock"}</CardTitle>
        <CardDescription>
          {flock ? "Update the details for this flock." : "Create a new flock for your poultry farm. You can track this flock throughout its lifecycle."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Flock Name</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="e.g., Batch A 2024"
                        data-testid="input-flock-name" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="breed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Breed</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-breed">
                          <SelectValue placeholder="Select breed" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="rhode-island-red">Rhode Island Red</SelectItem>
                        <SelectItem value="leghorn">Leghorn</SelectItem>
                        <SelectItem value="hy-line-brown">Hy-Line Brown</SelectItem>
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="initialCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial Count</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        value={field.value || 0}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          field.onChange(value);
                          // Only set current count to initial count for new flocks, not when editing
                          if (!flock) {
                            form.setValue("currentCount", value);
                          }
                        }}
                        data-testid="input-initial-count"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hatchDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hatch Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-hatch-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="brooding">Brooding</SelectItem>
                      <SelectItem value="laying">Laying</SelectItem>
                      <SelectItem value="retired">Retired</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              disabled={saveFlockMutation.isPending}
              data-testid="button-submit-flock"
              onClick={() => console.log("🔘 BUTTON CLICKED - Form valid:", form.formState.isValid, "Errors:", form.formState.errors)}
            >
              {saveFlockMutation.isPending ? (flock ? "Updating..." : "Creating...") : (flock ? "Update Flock" : "Create Flock")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}