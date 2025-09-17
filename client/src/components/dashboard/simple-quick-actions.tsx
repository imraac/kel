import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Egg, Skull, Wheat, Coins, Heart, Receipt, Building2, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import SimpleQuickEggForm from "@/components/forms/simple-quick-egg-form";
import SimpleMortalityForm from "@/components/forms/simple-mortality-form";
import SimpleFeedForm from "@/components/forms/simple-feed-form"; 
import SimpleSalesForm from "@/components/forms/simple-sales-form";
import SimpleHealthForm from "@/components/forms/simple-health-form";
import SimpleExpenseForm from "@/components/forms/simple-expense-form";

const actions = [
  {
    id: "record-eggs",
    title: "Record Eggs",
    description: "Daily egg collection",
    icon: Egg,
    color: "bg-chart-3/10 text-chart-3",
  },
  {
    id: "add-mortality",
    title: "Record Mortality",
    description: "Track bird losses",
    icon: Skull,
    color: "bg-red-100 text-red-600",
  },
  {
    id: "update-feed",
    title: "Update Feed",
    description: "Log feed consumption",
    icon: Wheat,
    color: "bg-orange-100 text-orange-600",
  },
  {
    id: "record-sale",
    title: "Record Sale",
    description: "Log egg sales",
    icon: Coins,
    color: "bg-green-100 text-green-600",
  },
  {
    id: "add-health",
    title: "Health Record",
    description: "Log health events",
    icon: Heart,
    color: "bg-pink-100 text-pink-600",
  },
  {
    id: "record-expense",
    title: "Record Expense",
    description: "Track farm expenses",
    icon: Receipt,
    color: "bg-blue-100 text-blue-600",
  },
];

export default function SimpleQuickActions() {
  const { user } = useAuth();
  const [eggDialogOpen, setEggDialogOpen] = useState(false);
  const [mortalityDialogOpen, setMortalityDialogOpen] = useState(false);
  const [feedDialogOpen, setFeedDialogOpen] = useState(false);
  const [saleDialogOpen, setSaleDialogOpen] = useState(false);
  const [healthDialogOpen, setHealthDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);

  // Show farm registration message if user doesn't have a farm
  if (user && !user.farmId) {
    return (
      <Card data-testid="card-quick-actions">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <h3 className="font-medium text-foreground">Farm Registration Required</h3>
              <p className="text-sm text-muted-foreground mt-1">
                To access quick actions and manage your poultry operations, you need to register your farm first.
              </p>
            </div>
            <Link to="/farm-registration">
              <Button className="mt-4" data-testid="button-register-farm">
                <Building2 className="h-4 w-4 mr-2" />
                Register Your Farm
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-quick-actions">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {actions.map((action) => {
            const Icon = action.icon;
            
            // Record Eggs Dialog
            if (action.id === "record-eggs") {
              return (
                <Dialog key={action.id} open={eggDialogOpen} onOpenChange={setEggDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" className="w-full flex items-center space-x-3 p-3 h-auto justify-start hover:bg-muted" data-testid={`button-${action.id}`}>
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${action.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-foreground">{action.title}</p>
                        <p className="text-xs text-muted-foreground">{action.description}</p>
                      </div>
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Record Eggs</DialogTitle>
                      <DialogDescription>Record today's egg collection with automatic crate calculation</DialogDescription>
                    </DialogHeader>
                    <SimpleQuickEggForm onSuccess={() => setEggDialogOpen(false)} />
                  </DialogContent>
                </Dialog>
              );
            }
            
            // Record Mortality Dialog
            if (action.id === "add-mortality") {
              return (
                <Dialog key={action.id} open={mortalityDialogOpen} onOpenChange={setMortalityDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" className="w-full flex items-center space-x-3 p-3 h-auto justify-start hover:bg-muted" data-testid={`button-${action.id}`}>
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${action.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-foreground">{action.title}</p>
                        <p className="text-xs text-muted-foreground">{action.description}</p>
                      </div>
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Record Mortality</DialogTitle>
                      <DialogDescription>Record bird losses with detailed reasons</DialogDescription>
                    </DialogHeader>
                    <SimpleMortalityForm onSuccess={() => setMortalityDialogOpen(false)} />
                  </DialogContent>
                </Dialog>
              );
            }
            
            // Update Feed Dialog
            if (action.id === "update-feed") {
              return (
                <Dialog key={action.id} open={feedDialogOpen} onOpenChange={setFeedDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" className="w-full flex items-center space-x-3 p-3 h-auto justify-start hover:bg-muted" data-testid={`button-${action.id}`}>
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${action.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-foreground">{action.title}</p>
                        <p className="text-xs text-muted-foreground">{action.description}</p>
                      </div>
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Update Feed</DialogTitle>
                      <DialogDescription>Log daily feed consumption with age-based guidance</DialogDescription>
                    </DialogHeader>
                    <SimpleFeedForm onSuccess={() => setFeedDialogOpen(false)} />
                  </DialogContent>
                </Dialog>
              );
            }
            
            // Record Sale Dialog
            if (action.id === "record-sale") {
              return (
                <Dialog key={action.id} open={saleDialogOpen} onOpenChange={setSaleDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" className="w-full flex items-center space-x-3 p-3 h-auto justify-start hover:bg-muted" data-testid={`button-${action.id}`}>
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${action.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-foreground">{action.title}</p>
                        <p className="text-xs text-muted-foreground">{action.description}</p>
                      </div>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Record Sale</DialogTitle>
                      <DialogDescription>Record egg sales with customer details and automatic calculations</DialogDescription>
                    </DialogHeader>
                    <SimpleSalesForm onSuccess={() => setSaleDialogOpen(false)} />
                  </DialogContent>
                </Dialog>
              );
            }

            // Add Health Record Dialog
            if (action.id === "add-health") {
              return (
                <Dialog key={action.id} open={healthDialogOpen} onOpenChange={setHealthDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" className="w-full flex items-center space-x-3 p-3 h-auto justify-start hover:bg-muted" data-testid={`button-${action.id}`}>
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${action.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-foreground">{action.title}</p>
                        <p className="text-xs text-muted-foreground">{action.description}</p>
                      </div>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Add Health Record</DialogTitle>
                      <DialogDescription>Record vaccination, medication, treatment, or health checkup</DialogDescription>
                    </DialogHeader>
                    <SimpleHealthForm onSuccess={() => setHealthDialogOpen(false)} />
                  </DialogContent>
                </Dialog>
              );
            }

            // Record Expense Dialog  
            if (action.id === "record-expense") {
              return (
                <Dialog key={action.id} open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" className="w-full flex items-center space-x-3 p-3 h-auto justify-start hover:bg-muted" data-testid={`button-${action.id}`}>
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${action.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-foreground">{action.title}</p>
                        <p className="text-xs text-muted-foreground">{action.description}</p>
                      </div>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Record Expense</DialogTitle>
                      <DialogDescription>Track farm expenses and operating costs</DialogDescription>
                    </DialogHeader>
                    <SimpleExpenseForm onSuccess={() => setExpenseDialogOpen(false)} />
                  </DialogContent>
                </Dialog>
              );
            }
            
            return null;
          })}
        </div>
      </CardContent>
    </Card>
  );
}