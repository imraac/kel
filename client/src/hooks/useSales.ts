import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useFarmContext } from "@/contexts/FarmContext";
import { apiRequest } from "@/lib/queryClient";
import { insertSaleSchema } from "@shared/schema";
import { z } from "zod";

// Type for the sale data (without farmId which is auto-injected)
type SaleData = Omit<z.infer<typeof insertSaleSchema>, 'farmId' | 'userId'>;

export function useSaleMutation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeFarmId } = useFarmContext();

  return useMutation({
    mutationFn: async (data: SaleData) => {
      // Prepare data with farmId for API
      const saleData = {
        ...data,
        farmId: activeFarmId,
      };
      
      console.log("Submitting sale record:", saleData);
      await apiRequest("POST", "/api/sales", saleData);
    },
    onSuccess: () => {
      // Invalidate all relevant caches with farm-scoped keys
      queryClient.invalidateQueries({ queryKey: ["/api/sales", activeFarmId] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics", activeFarmId] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/activity", activeFarmId] });
      
      toast({
        title: "Success",
        description: "Sale recorded successfully",
      });
    },
    onError: (error: any) => {
      console.error("Failed to create sale:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to record sale. Please try again.",
        variant: "destructive",
      });
    },
  });
}