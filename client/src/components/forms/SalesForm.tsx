import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useFarmContext } from "@/contexts/FarmContext";
import { useToast } from "@/hooks/use-toast";
import { insertSaleSchema } from "@shared/schema";
import { z } from "zod";
import { useSaleMutation } from "../../hooks/useSales";

// UI-specific validation schema that extends the shared schema
const salesFormSchema = insertSaleSchema.extend({
  saleDate: z.string().min(1, "Sale date is required"),
  customerName: z.string().min(1, "Customer name is required"),
  cratesSold: z.number().min(1, "Must sell at least 1 crate"),
  pricePerCrate: z.string().min(1, "Price per crate is required").refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    "Price must be a positive number"
  ),
  totalAmount: z.string().optional(), // Auto-calculated, so optional in form
  paymentStatus: z.enum(["pending", "paid", "overdue"]),
  notes: z.string().optional(),
}).omit({ farmId: true, userId: true }); // These are auto-injected

type SalesFormData = z.infer<typeof salesFormSchema>;

interface SalesFormProps {
  mode?: 'dialog' | 'page' | 'embedded';
  compact?: boolean;
  defaultValues?: Partial<SalesFormData>;
  onSuccess?: () => void;
  customerNameRequired?: boolean;
  showNotes?: boolean;
}

export default function SalesForm({ 
  mode = 'page',
  compact = false,
  defaultValues = {},
  onSuccess,
  customerNameRequired = true,
  showNotes = true
}: SalesFormProps) {
  const { hasActiveFarm } = useFarmContext();
  const { toast } = useToast();
  const createSaleMutation = useSaleMutation();

  // Create dynamic schema based on customerNameRequired prop
  const validationSchema = useMemo(() => {
    return customerNameRequired ? 
      salesFormSchema : 
      salesFormSchema.extend({ customerName: z.string().optional() });
  }, [customerNameRequired]);

  const form = useForm<SalesFormData>({
    resolver: zodResolver(validationSchema),
    defaultValues: {
      saleDate: new Date().toISOString().split('T')[0],
      customerName: "",
      cratesSold: 1,
      pricePerCrate: "",
      totalAmount: "0.00",
      paymentStatus: "pending",
      notes: "",
      ...defaultValues
    },
  });

  // Auto-calculate total amount
  const cratesSold = form.watch("cratesSold");
  const pricePerCrate = form.watch("pricePerCrate");

  useEffect(() => {
    if (cratesSold && pricePerCrate && !isNaN(parseFloat(pricePerCrate))) {
      const total = (cratesSold * parseFloat(pricePerCrate)).toFixed(2);
      form.setValue("totalAmount", total);
    }
  }, [cratesSold, pricePerCrate, form]);

  const onSubmit = (data: SalesFormData) => {
    if (!hasActiveFarm) {
      toast({
        title: "Farm Required",
        description: "Please select an active farm before submitting records.",
        variant: "destructive",
      });
      return;
    }

    // Prepare data with proper type coercion for API
    const saleData = {
      saleDate: data.saleDate,
      customerName: data.customerName?.trim() || null,
      cratesSold: data.cratesSold,
      pricePerCrate: parseFloat(data.pricePerCrate), // Convert to number for decimal field
      totalAmount: parseFloat(data.totalAmount || "0.00"), // Convert to number for decimal field
      paymentStatus: data.paymentStatus,
      notes: data.notes?.trim() || null,
    };

    createSaleMutation.mutate(saleData, {
      onSuccess: () => {
        form.reset();
        onSuccess?.();
      }
    });
  };

  const isLoading = createSaleMutation.isPending;

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className={compact ? "space-y-3" : "grid grid-cols-1 md:grid-cols-2 gap-4"}>
          <FormField
            control={form.control}
            name="saleDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sale Date</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                    data-testid="input-sale-date"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="customerName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Customer Name{customerNameRequired && " *"}</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter customer name"
                    {...field}
                    data-testid="input-customer-name"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cratesSold"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Crates Sold *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    placeholder="Enter number of crates"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    data-testid="input-crates-sold"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="pricePerCrate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price per Crate *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Enter price per crate"
                    {...field}
                    data-testid="input-price-per-crate"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="totalAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total Amount</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    readOnly
                    className="bg-muted"
                    data-testid="input-total-amount"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="paymentStatus"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-payment-status">
                      <SelectValue placeholder="Select payment status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {showNotes && (
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Additional notes about the sale"
                    className="resize-none"
                    {...field}
                    data-testid="textarea-notes"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <Button
          type="submit"
          disabled={isLoading || !hasActiveFarm}
          className="w-full"
          data-testid="button-submit-sale"
        >
          {isLoading ? "Recording Sale..." : "Record Sale"}
        </Button>
      </form>
    </Form>
  );

  if (mode === 'page') {
    return (
      <Card data-testid="card-sales-form">
        <CardHeader>
          <CardTitle>Record Sale</CardTitle>
          <CardDescription>
            Record egg sales with customer information and payment details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {formContent}
        </CardContent>
      </Card>
    );
  }

  return formContent;
}