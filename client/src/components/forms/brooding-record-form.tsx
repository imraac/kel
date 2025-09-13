import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertDailyRecordSchema } from "@shared/schema";
import { z } from "zod";

const broodingFormSchema = insertDailyRecordSchema.extend({
  recordDate: z.string().min(1, "Record date is required"),
  // Override numeric fields to handle empty values properly
  temperature: z.union([z.string(), z.number()]).transform((val) => {
    if (val === "" || val === undefined || val === null) return undefined;
    const num = typeof val === "string" ? parseFloat(val) : val;
    return isNaN(num) ? undefined : num;
  }).optional(),
  lightingHours: z.union([z.string(), z.number()]).transform((val) => {
    if (val === "" || val === undefined || val === null) return undefined;
    const num = typeof val === "string" ? parseFloat(val) : val;
    return isNaN(num) ? undefined : num;
  }).optional(),
  feedConsumed: z.union([z.string(), z.number()]).transform((val) => {
    if (val === "" || val === undefined || val === null) return undefined;
    const num = typeof val === "string" ? parseFloat(val) : val;
    return isNaN(num) ? undefined : num;
  }).optional(),
  averageWeight: z.union([z.string(), z.number()]).transform((val) => {
    if (val === "" || val === undefined || val === null) return undefined;
    const num = typeof val === "string" ? parseFloat(val) : val;
    return isNaN(num) ? undefined : num;
  }).optional(),
  mortalityCount: z.union([z.string(), z.number()]).transform((val) => {
    if (val === "" || val === undefined || val === null) return 0;
    const num = typeof val === "string" ? parseInt(val) : val;
    return isNaN(num) ? 0 : num;
  }),
  sampleSize: z.union([z.string(), z.number()]).transform((val) => {
    if (val === "" || val === undefined || val === null) return 0;
    const num = typeof val === "string" ? parseInt(val) : val;
    return isNaN(num) ? 0 : num;
  }),
}).omit({
  eggsCollected: true,
  brokenEggs: true, 
  cratesProduced: true,
});

type BroodingFormData = z.infer<typeof broodingFormSchema>;

interface BroodingRecordFormProps {
  onSuccess?: () => void;
}

export default function BroodingRecordForm({ onSuccess }: BroodingRecordFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<BroodingFormData>({
    resolver: zodResolver(broodingFormSchema),
    defaultValues: {
      recordDate: new Date().toISOString().split('T')[0],
      mortalityCount: 0,
      mortalityReason: "",
      feedConsumed: undefined,
      feedType: "",
      temperature: undefined,
      lightingHours: undefined,
      averageWeight: undefined,
      sampleSize: 0,
      notes: "",
    },
  });

  const { data: flocks = [] } = useQuery<any[]>({
    queryKey: ["/api/flocks"],
  });

  const createRecordMutation = useMutation({
    mutationFn: async (data: BroodingFormData) => {
      // Add default values for egg production fields to satisfy API
      const recordData = {
        ...data,
        eggsCollected: 0,
        brokenEggs: 0,
        cratesProduced: 0,
      };
      await apiRequest("POST", "/api/daily-records", recordData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/activity"] });
      toast({
        title: "Success",
        description: "Brooding record created successfully",
      });
      form.reset();
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create brooding record",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BroodingFormData) => {
    createRecordMutation.mutate(data);
  };

  return (
    <Card data-testid="card-brooding-record-form">
      <CardHeader>
        <CardTitle>Brooding Record</CardTitle>
        <CardDescription>
          Record daily brooding activities including temperature, lighting, feed consumption, and chick health.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="recordDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Record Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-record-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="flockId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Flock</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-flock">
                          <SelectValue placeholder="Select a flock" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {flocks.map((flock: any) => (
                          <SelectItem key={flock.id} value={flock.id}>
                            {flock.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Environment Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Environment Conditions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="temperature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Temperature (°C)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.1" 
                          {...field} 
                          value={field.value || ""}
                          data-testid="input-temperature"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lightingHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lighting Hours</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.5" 
                          {...field} 
                          value={field.value || ""}
                          placeholder="e.g., 18"
                          data-testid="input-lighting-hours"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Mortality Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Mortality</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="mortalityCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mortality Count</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          value={field.value || 0}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-mortality-count"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mortalityReason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mortality Reason</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          value={field.value || ""}
                          placeholder="e.g., Disease, Injury" 
                          data-testid="input-mortality-reason" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Feed Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Feed</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="feedConsumed"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Feed Consumed (kg)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          {...field} 
                          value={field.value || ""}
                          data-testid="input-feed-consumed"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="feedType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Feed Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-feed-type">
                            <SelectValue placeholder="Select feed type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="chick-starter">Chick Starter</SelectItem>
                          <SelectItem value="broiler-starter">Broiler Starter</SelectItem>
                          <SelectItem value="chick-grower">Chick Grower</SelectItem>
                          <SelectItem value="medicated-starter">Medicated Starter</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Weight Monitoring Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Weight Monitoring</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="averageWeight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Average Weight (g)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.1" 
                          {...field} 
                          value={field.value || ""}
                          data-testid="input-average-weight"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sampleSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sample Size</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          value={field.value || 0}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-sample-size"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      value={field.value || ""}
                      rows={3} 
                      data-testid="textarea-notes" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              disabled={createRecordMutation.isPending}
              data-testid="button-submit-brooding-record"
            >
              {createRecordMutation.isPending ? "Saving..." : "Save Brooding Record"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}