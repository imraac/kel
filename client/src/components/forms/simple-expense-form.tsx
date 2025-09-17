import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface SimpleExpenseFormProps {
  onSuccess?: () => void;
}

export default function SimpleExpenseForm({ onSuccess }: SimpleExpenseFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState("feed");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [vendor, setVendor] = useState("");
  const [notes, setNotes] = useState("");

  const createExpenseMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Submitting expense record:", data);
      await apiRequest("POST", "/api/expenses", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/activity"] });
      toast({
        title: "Success",
        description: "Expense recorded successfully"
      });
      
      // Reset form
      setExpenseDate(new Date().toISOString().split('T')[0]);
      setCategory("feed");
      setDescription("");
      setAmount("");
      setVendor("");
      setNotes("");
      
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      console.error("Failed to create expense:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to record expense. Please try again.",
        variant: "destructive"
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description.trim()) {
      toast({
        title: "Error",
        description: "Please enter a description",
        variant: "destructive"
      });
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Error",
        description: "Please enter valid amount",
        variant: "destructive"
      });
      return;
    }

    const expenseData = {
      expenseDate,
      category,
      description: description.trim(),
      amount: amount, // Send as string to match decimal field
      vendor: vendor.trim() || undefined,
      notes: notes.trim(),
    };

    createExpenseMutation.mutate(expenseData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="expenseDate">Date</Label>
          <Input
            id="expenseDate"
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            required
            data-testid="input-expense-date"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger data-testid="select-expense-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="feed">Feed & Nutrition</SelectItem>
              <SelectItem value="medication">Medication & Health</SelectItem>
              <SelectItem value="equipment">Equipment & Supplies</SelectItem>
              <SelectItem value="utilities">Utilities</SelectItem>
              <SelectItem value="labor">Labor & Wages</SelectItem>
              <SelectItem value="transport">Transportation</SelectItem>
              <SelectItem value="maintenance">Maintenance & Repairs</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Input
          id="description"
          placeholder="e.g., Layer feed purchase, Equipment repair"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          data-testid="input-expense-description"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount (KSh) *</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            data-testid="input-expense-amount"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="vendor">Vendor/Supplier</Label>
          <Input
            id="vendor"
            placeholder="e.g., ABC Feeds Ltd"
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            data-testid="input-expense-vendor"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Additional notes about this expense"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          data-testid="textarea-expense-notes"
        />
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={createExpenseMutation.isPending}
        data-testid="button-submit-expense"
      >
        {createExpenseMutation.isPending ? "Recording..." : "Record Expense"}
      </Button>
    </form>
  );
}