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

const formSchema = insertDailyRecordSchema.extend({
  recordDate: z.string().min(1, "Record date is required"),
});

type FormData = z.infer<typeof formSchema>;

interface DailyRecordFormProps {
  onSuccess?: () => void;
}

export default function DailyRecordForm({ onSuccess }: DailyRecordFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      recordDate: new Date().toISOString().split('T')[0],
      eggsCollected: 0,
      brokenEggs: 0,
      cratesProduced: 0,
      mortalityCount: 0,
      mortalityReason: "",
      feedConsumed: "",
      feedType: "",
      temperature: "",
      lightingHours: "",
      averageWeight: "",
      sampleSize: 0,
      notes: "",
    },
  });

  const { data: flocks = [] } = useQuery<any[]>({
    queryKey: ["/api/flocks"],
  });

  const createRecordMutation = useMutation({
    mutationFn: async (data: FormData) => {
      await apiRequest("POST", "/api/daily-records", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-records"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/activity"] });
      toast({
        title: "Success",
        description: "Daily record created successfully",
      });
      form.reset();
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create daily record",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createRecordMutation.mutate(data);
  };

  return (
    <Card data-testid="card-daily-record-form">
      <CardHeader>
        <CardTitle>Daily Record</CardTitle>
        <CardDescription>
          Record daily farm activities including egg production, mortality, and feed consumption.
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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

            {/* Egg Production Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Egg Production</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="eggsCollected"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Eggs Collected</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          value={field.value || 0}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-eggs-collected"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="brokenEggs"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Broken Eggs</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          value={field.value || 0}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-broken-eggs"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cratesProduced"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Crates Produced</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          value={field.value || 0}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-crates-produced"
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
                        <Input {...field} value={field.value || ""} placeholder="e.g., Disease, Injury" data-testid="input-mortality-reason" />
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
                          <SelectItem value="layer-mash">Layer Mash</SelectItem>
                          <SelectItem value="layer-pellets">Layer Pellets</SelectItem>
                          <SelectItem value="chick-starter">Chick Starter</SelectItem>
                          <SelectItem value="broiler-starter">Broiler Starter</SelectItem>
                        </SelectContent>
                      </Select>
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
                    <Textarea {...field} value={field.value || ""} rows={3} data-testid="textarea-notes" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              disabled={createRecordMutation.isPending}
              data-testid="button-submit-daily-record"
            >
              {createRecordMutation.isPending ? "Saving..." : "Save Record"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
