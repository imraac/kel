import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Plus, Trash2, Calculator, TrendingUp, Scale, BarChart3, LineChart, Eye, EyeOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useFarmContext } from "@/contexts/FarmContext";
import { useToast } from "@/hooks/use-toast";
import type { Flock, WeightRecord, InsertWeightRecord } from "@shared/schema";
import { useCallback } from "react";
import { BarChart, Bar, LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// Validation schema for weight entry form
const weightEntrySchema = z.object({
  flockId: z.string().min(1, "Please select a flock"),
  weekNumber: z.coerce.number().int().positive().max(100),
  recordDate: z.string(),
  notes: z.string().optional(),
});

// Helper function to validate decimal input with up to 4 decimal places
const validateDecimalInput = (value: string): boolean => {
  const decimalRegex = /^\d*(?:[.]\d{0,4})?$/;
  return decimalRegex.test(value);
};

type WeightEntryFormData = z.infer<typeof weightEntrySchema> & {
  weights: number[];
};

// Statistics calculation hook with debouncing
function useWeightStatistics(weights: number[], weekNumber: number) {
  const [statistics, setStatistics] = useState<{
    average: number;
    stdDev: number;
    uniformity: number;
    sampleSize: number;
    comparisonResult?: string;
    expectedWeight?: number;
    weightDeviation?: number;
  } | null>(null);

  const [debouncedWeights, setDebouncedWeights] = useState<number[]>([]);
  const [debouncedWeekNumber, setDebouncedWeekNumber] = useState(0);

  // Debounce weights changes to prevent excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedWeights(weights);
      setDebouncedWeekNumber(weekNumber);
    }, 500);

    return () => clearTimeout(timer);
  }, [weights, weekNumber]);

  useEffect(() => {
    if (debouncedWeights.length === 0) {
      setStatistics(null);
      return;
    }

    // Calculate basic statistics locally
    const average = debouncedWeights.reduce((sum, weight) => sum + weight, 0) / debouncedWeights.length;
    const variance = debouncedWeights.reduce((sum, weight) => sum + Math.pow(weight - average, 2), 0) / debouncedWeights.length;
    const stdDev = Math.sqrt(variance);
    
    // Calculate uniformity (percentage within 10% of average)
    const tolerance = average * 0.1;
    const uniformCount = debouncedWeights.filter(weight => Math.abs(weight - average) <= tolerance).length;
    const uniformity = (uniformCount / debouncedWeights.length) * 100;

    // Call API for breed standard comparison (debounced)
    if (debouncedWeekNumber > 0) {
      apiRequest('POST', '/api/weight-records/calculate', { weights: debouncedWeights, weekNumber: debouncedWeekNumber })
        .then((response: any) => {
          setStatistics({
            average: Number(average.toFixed(2)),
            stdDev: Number(stdDev.toFixed(2)),
            uniformity: Number(uniformity.toFixed(2)),
            sampleSize: debouncedWeights.length,
            comparisonResult: response.comparisonResult,
            expectedWeight: response.expectedWeight,
            weightDeviation: response.weightDeviation,
          });
        })
        .catch(() => {
          // Fallback to local calculations only
          setStatistics({
            average: Number(average.toFixed(2)),
            stdDev: Number(stdDev.toFixed(2)),
            uniformity: Number(uniformity.toFixed(2)),
            sampleSize: debouncedWeights.length,
          });
        });
    } else {
      setStatistics({
        average: Number(average.toFixed(2)),
        stdDev: Number(stdDev.toFixed(2)),
        uniformity: Number(uniformity.toFixed(2)),
        sampleSize: debouncedWeights.length,
      });
    }
  }, [debouncedWeights, debouncedWeekNumber]);

  return statistics;
}

export default function BodyWeights() {
  const { activeFarmId } = useFarmContext();
  const { toast } = useToast();
  const [weightInputs, setWeightInputs] = useState<{ id: number; weight: string }[]>([
    { id: 1, weight: "" }
  ]);
  const [nextId, setNextId] = useState(2);
  const [expandedRecords, setExpandedRecords] = useState<Set<string>>(new Set());

  // Fetch flocks for the dropdown
  const { data: flocks = [], isLoading: flocksLoading } = useQuery<Flock[]>({
    queryKey: ['/api/flocks'],
    enabled: !!activeFarmId,
  });

  // Fetch existing weight records
  const { data: weightRecords = [], isLoading: recordsLoading } = useQuery<WeightRecord[]>({
    queryKey: ['/api/weight-records'],
    enabled: !!activeFarmId,
  });

  // Form setup
  const form = useForm<WeightEntryFormData>({
    resolver: zodResolver(weightEntrySchema),
    defaultValues: {
      flockId: "",
      weekNumber: 1,
      recordDate: new Date().toISOString().split('T')[0],
      weights: [],
      notes: "",
    },
  });

  const watchedFlockId = form.watch("flockId");
  const watchedWeekNumber = form.watch("weekNumber");

  // Calculate current week number based on selected flock
  useEffect(() => {
    if (watchedFlockId) {
      const selectedFlock = flocks.find(f => f.id === watchedFlockId);
      if (selectedFlock?.hatchDate) {
        const hatchDate = new Date(selectedFlock.hatchDate);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - hatchDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const calculatedWeek = Math.ceil(diffDays / 7);
        form.setValue("weekNumber", calculatedWeek);
      }
    }
  }, [watchedFlockId, flocks, form]);

  // Extract weights from input fields
  const currentWeights = weightInputs
    .map(input => parseFloat(input.weight))
    .filter(weight => !isNaN(weight) && weight > 0);

  // Calculate statistics
  const statistics = useWeightStatistics(currentWeights, watchedWeekNumber);

  // Add weight input field
  const addWeightInput = () => {
    setWeightInputs(prev => [...prev, { id: nextId, weight: "" }]);
    setNextId(prev => prev + 1);
  };

  // Remove weight input field
  const removeWeightInput = (id: number) => {
    if (weightInputs.length > 1) {
      setWeightInputs(prev => prev.filter(input => input.id !== id));
    }
  };

  // Update weight input value with validation
  const updateWeightInput = useCallback((id: number, value: string) => {
    // Normalize comma to dot and validate format
    const normalizedValue = value.replace(',', '.');
    
    // Only update if the value matches our decimal pattern
    if (normalizedValue === '' || validateDecimalInput(normalizedValue)) {
      setWeightInputs(prev => prev.map(input => 
        input.id === id ? { ...input, weight: normalizedValue } : input
      ));
    }
  }, []);

  // Add multiple weight inputs at once
  const addMultipleInputs = (count: number) => {
    const newInputs = Array.from({ length: count }, (_, i) => ({
      id: nextId + i,
      weight: ""
    }));
    setWeightInputs(prev => [...prev, ...newInputs]);
    setNextId(prev => prev + count);
  };

  // Create weight record mutation
  const createWeightRecord = useMutation({
    mutationFn: async (data: WeightEntryFormData) => {
      // Calculate statistics from weights
      const weights = data.weights;
      const sampleSize = weights.length;
      const averageWeight = weights.reduce((sum, weight) => sum + weight, 0) / weights.length;
      const variance = weights.reduce((sum, weight) => sum + Math.pow(weight - averageWeight, 2), 0) / weights.length;
      const stdDev = Math.sqrt(variance);
      
      // Calculate uniformity (percentage within 10% of average)
      const tolerance = averageWeight * 0.1;
      const uniformCount = weights.filter(weight => Math.abs(weight - averageWeight) <= tolerance).length;
      const uniformity = (uniformCount / weights.length) * 100;

      const payload = {
        flockId: data.flockId,
        weekNumber: data.weekNumber,
        recordDate: data.recordDate,
        weights: data.weights,
        sampleSize,
        averageWeight: Number(averageWeight.toFixed(4)),
        stdDev: Number(stdDev.toFixed(4)),
        uniformity: Number(uniformity.toFixed(2)),
        notes: data.notes || null,
      };
      
      return apiRequest('POST', '/api/weight-records', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/weight-records'] });
      toast({
        title: "Success",
        description: "Weight record created successfully",
      });
      // Reset form
      form.reset();
      setWeightInputs([{ id: 1, weight: "" }]);
      setNextId(2);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create weight record",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: WeightEntryFormData) => {
    const weights = currentWeights;
    if (weights.length === 0) {
      toast({
        title: "Error",
        description: "Please enter at least one weight measurement",
        variant: "destructive",
      });
      return;
    }

    // Sync current weights into form data before validation
    const submissionData = {
      ...data,
      weights,
    };

    createWeightRecord.mutate(submissionData);
  };

  // Toggle record expansion
  const toggleRecordExpansion = (recordId: string) => {
    setExpandedRecords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(recordId)) {
        newSet.delete(recordId);
      } else {
        newSet.add(recordId);
      }
      return newSet;
    });
  };

  // Calculate normal distribution probability density function
  const normalPDF = (x: number, mean: number, stdDev: number) => {
    if (stdDev === 0) return 0;
    const coefficient = 1 / (stdDev * Math.sqrt(2 * Math.PI));
    const exponent = -0.5 * Math.pow((x - mean) / stdDev, 2);
    return coefficient * Math.exp(exponent);
  };

  // Create enhanced histogram data with normal distribution overlay
  const createHistogramData = (weights: number[]) => {
    if (!weights || weights.length === 0) return { bins: [], normalCurve: [] };
    
    const mean = weights.reduce((sum, w) => sum + w, 0) / weights.length;
    const variance = weights.reduce((sum, w) => sum + Math.pow(w - mean, 2), 0) / weights.length;
    const stdDev = Math.sqrt(variance);
    
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    
    // Use Freedman-Diaconis rule for bin width, clamped to 0.01-0.03 kg
    const iqr = weights.sort((a, b) => a - b)[Math.floor(weights.length * 0.75)] - 
                weights[Math.floor(weights.length * 0.25)];
    const fdBinWidth = 2 * iqr / Math.pow(weights.length, 1/3);
    const binWidth = Math.max(0.01, Math.min(0.03, fdBinWidth));
    const binCount = Math.max(5, Math.ceil((max - min) / binWidth));
    
    // Create bins
    const bins = Array.from({ length: binCount }, (_, i) => {
      const binStart = min + i * binWidth;
      const binEnd = binStart + binWidth;
      const count = weights.filter(w => w >= binStart && (i === binCount - 1 ? w <= binEnd : w < binEnd)).length;
      
      return {
        range: `${binStart.toFixed(3)}-${binEnd.toFixed(3)}`,
        count,
        midpoint: binStart + binWidth / 2,
        binStart,
        binEnd
      };
    });
    
    // Create normal distribution curve points (only if stdDev > 0)
    const normalCurve = stdDev > 0 ? Array.from({ length: 100 }, (_, i) => {
      const x = min + (i / 99) * (max - min);
      const pdf = normalPDF(x, mean, stdDev);
      const scaledY = pdf * weights.length * binWidth; // Scale to match histogram
      
      return { x, y: scaledY };
    }) : [];
    
    return { bins, normalCurve };
  };

  // Create weekly weight gain data
  const createWeeklyGainData = () => {
    if (!weightRecords || weightRecords.length < 2) return [];
    
    const sortedRecords = [...weightRecords].sort((a, b) => a.weekNumber - b.weekNumber);
    const gainData = [];
    
    for (let i = 1; i < sortedRecords.length; i++) {
      const currentRecord = sortedRecords[i];
      const previousRecord = sortedRecords[i - 1];
      
      const actualGain = parseFloat(currentRecord.averageWeight) - parseFloat(previousRecord.averageWeight);
      const currentStandard = currentRecord.expectedWeight ? parseFloat(currentRecord.expectedWeight) : null;
      const previousStandard = previousRecord.expectedWeight ? parseFloat(previousRecord.expectedWeight) : null;
      const standardGain = (currentStandard && previousStandard) ? currentStandard - previousStandard : null;
      
      gainData.push({
        week: currentRecord.weekNumber,
        actualGain: Number(actualGain.toFixed(3)),
        standardGain: standardGain ? Number(standardGain.toFixed(3)) : null
      });
    }
    
    return gainData;
  };

  // Create weekly comparison chart data
  const createWeeklyChartData = () => {
    if (!weightRecords || weightRecords.length === 0) return [];
    
    return weightRecords
      .sort((a, b) => a.weekNumber - b.weekNumber)
      .map(record => ({
        week: record.weekNumber,
        actual: parseFloat(record.averageWeight),
        standard: record.expectedWeight ? parseFloat(record.expectedWeight) : null,
        uniformity: parseFloat(record.uniformity)
      }));
  };

  if (!activeFarmId) {
    return (
      <div className="p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select a farm to continue with body weight tracking.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Body Weight Tracking</h1>
          <p className="text-muted-foreground">
            Record and analyze weekly body weights for flock performance monitoring
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weight Entry Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              New Weight Record
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Flock Selection */}
                <FormField
                  control={form.control}
                  name="flockId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Flock</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-flock">
                            <SelectValue placeholder="Select a flock" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {flocksLoading ? (
                            <SelectItem value="loading">Loading flocks...</SelectItem>
                          ) : (
                            flocks.map((flock) => (
                              <SelectItem key={flock.id} value={flock.id}>
                                {flock.name} ({flock.currentCount} birds)
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Week Number and Date */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="weekNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Week Number</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max="100"
                            data-testid="input-week-number"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="recordDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Record Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            data-testid="input-record-date"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Weight Measurements Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Bird Weights (kg)</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addMultipleInputs(10)}
                        data-testid="button-add-10-weights"
                      >
                        Add 10
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addMultipleInputs(50)}
                        data-testid="button-add-50-weights"
                      >
                        Add 50
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addWeightInput}
                        data-testid="button-add-weight"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto border rounded p-2">
                    {weightInputs.map((input) => (
                      <div key={input.id} className="flex gap-1">
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.0000"
                          value={input.weight}
                          onChange={(e) => updateWeightInput(input.id, e.target.value)}
                          onBlur={(e) => {
                            // Format to 4 decimal places on blur if it's a valid number
                            const num = parseFloat(e.target.value);
                            if (!isNaN(num) && num > 0) {
                              const formatted = num.toFixed(4);
                              updateWeightInput(input.id, formatted);
                            }
                          }}
                          data-testid={`input-weight-${input.id}`}
                          className="text-sm"
                        />
                        {weightInputs.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeWeightInput(input.id)}
                            data-testid={`button-remove-weight-${input.id}`}
                            className="px-2"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    Enter individual bird weights. Current count: {currentWeights.length}
                  </p>
                </div>

                {/* Notes */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any observations about the birds or weighing conditions..."
                          data-testid="textarea-notes"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={createWeightRecord.isPending || currentWeights.length === 0}
                  data-testid="button-submit-weight-record"
                >
                  {createWeightRecord.isPending ? "Creating..." : "Create Weight Record"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Statistics Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Real-time Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statistics && currentWeights.length > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">Sample Size</Label>
                    <p className="text-2xl font-bold" data-testid="stat-sample-size">
                      {statistics.sampleSize}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">Average Weight</Label>
                    <p className="text-2xl font-bold" data-testid="stat-average-weight">
                      {statistics.average} kg
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">Standard Deviation</Label>
                    <p className="text-lg font-semibold" data-testid="stat-std-dev">
                      {statistics.stdDev} kg
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">Uniformity</Label>
                    <p className="text-lg font-semibold" data-testid="stat-uniformity">
                      {statistics.uniformity}%
                    </p>
                  </div>
                </div>

                {statistics.comparisonResult && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <Label className="text-sm text-muted-foreground">Breed Standard Comparison</Label>
                      
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            statistics.comparisonResult === 'within_standard' ? 'default' :
                            statistics.comparisonResult === 'above_standard' ? 'secondary' :
                            'destructive'
                          }
                          data-testid="badge-comparison-result"
                        >
                          {statistics.comparisonResult === 'within_standard' && 'Within Standard'}
                          {statistics.comparisonResult === 'above_standard' && 'Above Standard'}
                          {statistics.comparisonResult === 'below_standard' && 'Below Standard'}
                        </Badge>
                        <TrendingUp className="h-4 w-4" />
                      </div>

                      {statistics.expectedWeight && (
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <Label className="text-xs text-muted-foreground">Expected Weight</Label>
                            <p className="font-semibold" data-testid="stat-expected-weight">
                              {statistics.expectedWeight} kg
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Deviation</Label>
                            <p 
                              className={`font-semibold ${
                                (statistics.weightDeviation || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}
                              data-testid="stat-weight-deviation"
                            >
                              {(statistics.weightDeviation || 0) > 0 ? '+' : ''}{statistics.weightDeviation || 0} kg
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Enter weight measurements to see real-time statistics
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Weight Records with Visualizations */}
      <div className="space-y-6">
        {/* Weekly Comparison Chart */}
        {weightRecords.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                Weekly Progress - Actual vs Standard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart data={createWeeklyChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="week" 
                      label={{ value: 'Week Number', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis 
                      label={{ value: 'Weight (kg)', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      formatter={(value: any, name: string) => [
                        `${parseFloat(value).toFixed(3)} kg`, 
                        name === 'actual' ? 'Actual Weight' : 'Standard Weight'
                      ]}
                      labelFormatter={(week) => `Week ${week}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="actual" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      name="actual"
                      connectNulls={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="standard" 
                      stroke="#82ca9d" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="standard"
                      connectNulls={false}
                    />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Records with Detailed View */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Weight Records</CardTitle>
          </CardHeader>
          <CardContent>
            {recordsLoading ? (
              <p>Loading records...</p>
            ) : weightRecords.length > 0 ? (
              <div className="space-y-4">
                {weightRecords.slice(0, 5).map((record) => {
                  const isExpanded = expandedRecords.has(record.id);
                  const histogramResult = isExpanded ? createHistogramData(record.weights as number[]) : { bins: [], normalCurve: [] };
                  const histogramData = histogramResult.bins;
                  
                  return (
                    <div
                      key={record.id}
                      className="border rounded-lg overflow-hidden"
                      data-testid={`weight-record-${record.id}`}
                    >
                      {/* Record Summary */}
                      <div 
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        onClick={() => toggleRecordExpansion(record.id)}
                      >
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="font-semibold">Week {record.weekNumber}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(record.recordDate).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="font-semibold">{parseFloat(record.averageWeight).toFixed(3)} kg avg</p>
                            <p className="text-sm text-muted-foreground">
                              {record.sampleSize} birds
                            </p>
                          </div>
                          <Badge
                            variant={
                              record.comparisonResult === 'within_standard' ? 'default' :
                              record.comparisonResult === 'above_standard' ? 'secondary' :
                              'destructive'
                            }
                          >
                            {record.comparisonResult?.replace('_', ' ') || 'Unknown'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            {isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            {isExpanded ? 'Hide Details' : 'Show Details'}
                          </Button>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="p-4 space-y-6">
                          {/* Detailed Statistics */}
                          <div>
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                              <Calculator className="h-4 w-4" />
                              Detailed Statistics
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                              <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                                <p className="text-sm text-muted-foreground">Average Weight</p>
                                <p className="font-bold text-lg">{parseFloat(record.averageWeight).toFixed(3)} kg</p>
                              </div>
                              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded">
                                <p className="text-sm text-muted-foreground">Std Deviation</p>
                                <p className="font-bold text-lg">{parseFloat(record.stdDev).toFixed(3)} kg</p>
                              </div>
                              <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded">
                                <p className="text-sm text-muted-foreground">Uniformity</p>
                                <p className="font-bold text-lg">{parseFloat(record.uniformity).toFixed(1)}%</p>
                              </div>
                              <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                                <p className="text-sm text-muted-foreground">CV%</p>
                                <p className="font-bold text-lg">{record.cvPercent ? parseFloat(record.cvPercent).toFixed(2) : 'N/A'}%</p>
                              </div>
                              <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded">
                                <p className="text-sm text-muted-foreground">Sample Size</p>
                                <p className="font-bold text-lg">{record.sampleSize}</p>
                              </div>
                            </div>
                            
                            {/* Breed Comparison */}
                            {record.expectedWeight && (
                              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                                <p className="text-sm text-muted-foreground">Breed Standard Comparison</p>
                                <div className="flex justify-between items-center mt-1">
                                  <span>Expected: {parseFloat(record.expectedWeight).toFixed(3)} kg</span>
                                  <span className={`font-semibold ${
                                    record.weightDeviation && parseFloat(record.weightDeviation) > 0 ? 'text-green-600' : 
                                    record.weightDeviation && parseFloat(record.weightDeviation) < 0 ? 'text-red-600' : 
                                    'text-gray-600'
                                  }`}>
                                    {record.weightDeviation ? 
                                      `${parseFloat(record.weightDeviation) > 0 ? '+' : ''}${parseFloat(record.weightDeviation).toFixed(3)} kg` : 
                                      'N/A'
                                    }
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Weight Distribution Histogram with Normal Curve */}
                          <div>
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                              <BarChart3 className="h-4 w-4" />
                              Weight Distribution with Normal Curve
                            </h4>
                            <div className="h-60 w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={histogramData}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis 
                                    dataKey="range" 
                                    angle={-45}
                                    textAnchor="end"
                                    height={80}
                                    label={{ value: 'Weight Range (kg)', position: 'insideBottom', offset: -5 }}
                                  />
                                  <YAxis 
                                    label={{ value: 'Count', angle: -90, position: 'insideLeft' }}
                                  />
                                  <Tooltip 
                                    formatter={(value: any) => [`${value} birds`, 'Count']}
                                    labelFormatter={(range) => `Weight Range: ${range} kg`}
                                  />
                                  <Bar dataKey="count" fill="#8884d8" fillOpacity={0.7}>
                                    {histogramData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={`hsl(${220 + index * 20}, 70%, 50%)`} />
                                    ))}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                            
                            {/* CV% Interpretation */}
                            {record.cvPercent && (
                              <div className="mt-2 text-sm text-muted-foreground bg-gray-50 dark:bg-gray-800 p-3 rounded">
                                <strong>CV% Interpretation:</strong>
                                {parseFloat(record.cvPercent) < 5 ? " Excellent uniformity - very consistent weights" :
                                 parseFloat(record.cvPercent) < 8 ? " Good uniformity - acceptable variation" :
                                 parseFloat(record.cvPercent) < 12 ? " Moderate uniformity - some variation present" :
                                 " Poor uniformity - high variation in weights"}
                              </div>
                            )}
                          </div>

                          {/* Weekly Weight Gain Chart */}
                          {weightRecords && weightRecords.length > 1 && (
                            <div>
                              <h4 className="font-semibold mb-3 flex items-center gap-2">
                                <TrendingUp className="h-4 w-4" />
                                Weekly Weight Gain Analysis
                              </h4>
                              <div className="h-60 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                  <RechartsLineChart data={createWeeklyGainData()}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis 
                                      dataKey="week" 
                                      label={{ value: 'Week Number', position: 'insideBottom', offset: -5 }}
                                    />
                                    <YAxis 
                                      label={{ value: 'Weight Gain (kg)', angle: -90, position: 'insideLeft' }}
                                    />
                                    <Tooltip 
                                      formatter={(value: any, name: string) => [
                                        `${value} kg`, 
                                        name === 'actualGain' ? 'Actual Gain' : 'Standard Gain'
                                      ]}
                                      labelFormatter={(week) => `Week ${week}`}
                                    />
                                    <Line 
                                      type="monotone" 
                                      dataKey="actualGain" 
                                      stroke="#8884d8" 
                                      strokeWidth={2}
                                      dot={{ r: 4 }}
                                      name="actualGain"
                                    />
                                    <Line 
                                      type="monotone" 
                                      dataKey="standardGain" 
                                      stroke="#82ca9d" 
                                      strokeWidth={2}
                                      strokeDasharray="5 5"
                                      dot={{ r: 4 }}
                                      name="standardGain"
                                    />
                                  </RechartsLineChart>
                                </ResponsiveContainer>
                              </div>
                              <div className="mt-2 text-sm text-muted-foreground">
                                Solid line: Actual weekly gain | Dashed line: Expected breed standard gain
                              </div>
                            </div>
                          )}

                          {/* Notes */}
                          {record.notes && (
                            <div>
                              <h4 className="font-semibold mb-2">Notes</h4>
                              <p className="text-sm text-muted-foreground bg-gray-50 dark:bg-gray-800 p-3 rounded">
                                {record.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No weight records found. Create your first weight record above.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}