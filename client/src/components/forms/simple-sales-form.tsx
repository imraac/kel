import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useFarmContext } from "@/contexts/FarmContext";

interface SimpleSalesFormProps {
  onSuccess?: () => void;
}

export default function SimpleSalesForm({ onSuccess }: SimpleSalesFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeFarmId, hasActiveFarm } = useFarmContext();

  // Form state
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [customerName, setCustomerName] = useState("");
  const [cratesSold, setCratesSold] = useState("");
  const [pricePerCrate, setPricePerCrate] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [notes, setNotes] = useState("");

  // Auto-calculate total amount
  const handleCratesOrPriceChange = (crates: string, price: string) => {
    const cratesNum = parseFloat(crates) || 0;
    const priceNum = parseFloat(price) || 0;
    const total = (cratesNum * priceNum).toFixed(2);
    setTotalAmount(total);
  };

  const createSaleMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Submitting sale record:", data);
      await apiRequest("POST", "/api/sales", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sales?farmId=${activeFarmId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/activity"] });
      toast({
        title: "Success",
        description: "Sale recorded successfully"
      });
      
      // Reset form
      setSaleDate(new Date().toISOString().split('T')[0]);
      setCustomerName("");
      setCratesSold("");
      setPricePerCrate("");
      setTotalAmount("");
      setPaymentStatus("pending");
      setNotes("");
      
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      console.error("Failed to create sale:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to record sale. Please try again.",
        variant: "destructive"
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hasActiveFarm) {
      toast({
        title: "Farm Required",
        description: "Please select an active farm before submitting records.",
        variant: "destructive",
      });
      return;
    }
    
    if (!customerName.trim()) {
      toast({
        title: "Error",
        description: "Please enter customer name",
        variant: "destructive"
      });
      return;
    }

    if (!cratesSold || parseFloat(cratesSold) <= 0) {
      toast({
        title: "Error", 
        description: "Please enter valid number of crates sold",
        variant: "destructive"
      });
      return;
    }

    if (!pricePerCrate || parseFloat(pricePerCrate) <= 0) {
      toast({
        title: "Error",
        description: "Please enter valid price per crate",
        variant: "destructive"
      });
      return;
    }

    const saleData = {
      saleDate,
      customerName: customerName.trim(),
      cratesSold: parseInt(cratesSold),
      pricePerCrate: pricePerCrate, // Send as string to match decimal field
      totalAmount: totalAmount, // Send as string to match decimal field
      paymentStatus,
      notes: notes.trim(),
      farmId: activeFarmId,
    };

    createSaleMutation.mutate(saleData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Sale Information */}
      <Card>
        <CardHeader>
          <CardTitle>Sale Details</CardTitle>
          <CardDescription>Record egg sales with customer information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="saleDate">Sale Date</Label>
              <Input
                id="saleDate"
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                required
                data-testid="input-sale-date"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerName">Customer Name</Label>
              <Input
                id="customerName"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name"
                required
                data-testid="input-customer-name"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sale Details */}
      <Card>
        <CardHeader>
          <CardTitle>Sale Amount</CardTitle>
          <CardDescription>Enter quantity and pricing details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cratesSold">Crates Sold</Label>
              <Input
                id="cratesSold"
                type="number"
                step="1"
                value={cratesSold}
                onChange={(e) => {
                  setCratesSold(e.target.value);
                  handleCratesOrPriceChange(e.target.value, pricePerCrate);
                }}
                placeholder="5"
                required
                data-testid="input-crates-sold"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pricePerCrate">Price per Crate (KSh)</Label>
              <Input
                id="pricePerCrate"
                type="number"
                step="0.01"
                value={pricePerCrate}
                onChange={(e) => {
                  setPricePerCrate(e.target.value);
                  handleCratesOrPriceChange(cratesSold, e.target.value);
                }}
                placeholder="550.00"
                required
                data-testid="input-price-per-crate"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalAmount">Total Amount (KSh)</Label>
              <Input
                id="totalAmount"
                type="text"
                value={totalAmount}
                readOnly
                className="bg-muted"
                placeholder="Auto-calculated"
                data-testid="input-total-amount"
              />
              <p className="text-xs text-muted-foreground">
                Calculated automatically
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Information */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Status</CardTitle>
          <CardDescription>Track payment and add notes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paymentStatus">Payment Status</Label>
              <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                <SelectTrigger data-testid="select-payment-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Payment method, delivery instructions, or other notes..."
                className="min-h-[80px]"
                data-testid="textarea-notes"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button 
        type="submit" 
        className="w-full" 
        disabled={createSaleMutation.isPending}
        data-testid="button-submit"
      >
        {createSaleMutation.isPending ? "Recording Sale..." : "Record Sale"}
      </Button>
    </form>
  );
}