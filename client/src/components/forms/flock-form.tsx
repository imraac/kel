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

const flockFormSchema = insertFlockSchema.extend({
  hatchDate: z.string().min(1, "Hatch date is required"),
});

type FlockFormData = z.infer<typeof flockFormSchema>;

interface FlockFormProps {
  flock?: any; // For editing existing flock
  onSuccess?: () => void;
}

export default function FlockForm({ flock, onSuccess }: FlockFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FlockFormData>({
    resolver: zodResolver(flockFormSchema),
    defaultValues: {
      name: flock?.name || "",
      breed: flock?.breed || "",
      initialCount: flock?.initialCount || 0,
      currentCount: flock?.currentCount || 0,
      hatchDate: flock?.hatchDate ? new Date(flock.hatchDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      status: flock?.status || "brooding",
    },
  });

  const saveFlockMutation = useMutation({
    mutationFn: async (data: FlockFormData) => {
      if (flock) {
        // Editing existing flock
        await apiRequest("PUT", `/api/flocks/${flock.id}`, data);
      } else {
        // Creating new flock
        const flockData = {
          ...data,
          currentCount: data.initialCount, // Set current count to initial count for new flocks
        };
        await apiRequest("POST", "/api/flocks", flockData);
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

  const onSubmit = (data: FlockFormData) => {
    saveFlockMutation.mutate(data);
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
            >
              {saveFlockMutation.isPending ? (flock ? "Updating..." : "Creating...") : (flock ? "Update Flock" : "Create Flock")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}