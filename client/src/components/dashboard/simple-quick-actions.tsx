import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Egg, Skull, Wheat, Coins, Heart, Receipt, Building2, ArrowRight, AlertCircle } from "lucide-react";
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

  const hasFarm = user && user.farmId;
  const needsFarmRegistration = user && !user.farmId;

  // Actions that require a farm to function
  const farmDependentActions = ["record-eggs", "add-mortality", "update-feed", "record-sale", "add-health"];
  
  const isActionDisabled = (actionId: string) => {
    return needsFarmRegistration && farmDependentActions.includes(actionId);
  };

  return (
    <TooltipProvider>
      <Card data-testid="card-quick-actions">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Non-blocking farm registration banner */}
            {needsFarmRegistration && (
              <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-3">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                  </div>
                  <div className="flex-grow min-w-0">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      Farm Registration Recommended
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                      Register your farm to unlock all quick actions and manage poultry operations.
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <Link to="/farm-registration">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-xs h-7 px-2 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900"
                        data-testid="button-register-farm"
                      >
                        <Building2 className="h-3 w-3 mr-1" />
                        Register
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}
          {actions.map((action) => {
            const Icon = action.icon;
            
            // Record Eggs Dialog
            if (action.id === "record-eggs") {
              const disabled = isActionDisabled(action.id);
              
              if (disabled) {
                return (
                  <Tooltip key={action.id}>
                    <TooltipTrigger asChild>
                      <span className="inline-block w-full">
                        <Button 
                          variant="ghost" 
                          disabled 
                          className="w-full flex items-center space-x-3 p-3 h-auto justify-start opacity-50 cursor-not-allowed pointer-events-none" 
                          data-testid={`button-${action.id}-disabled`}
                        >
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${action.color} opacity-50`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-medium text-foreground">{action.title}</p>
                            <p className="text-xs text-muted-foreground">{action.description}</p>
                          </div>
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Register your farm to record egg production</p>
                    </TooltipContent>
                  </Tooltip>
                );
              }
              
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
              const disabled = isActionDisabled(action.id);
              
              if (disabled) {
                return (
                  <Tooltip key={action.id}>
                    <TooltipTrigger asChild>
                      <span className="inline-block w-full">
                        <Button 
                          variant="ghost" 
                          disabled 
                          className="w-full flex items-center space-x-3 p-3 h-auto justify-start opacity-50 cursor-not-allowed pointer-events-none" 
                          data-testid={`button-${action.id}-disabled`}
                        >
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${action.color} opacity-50`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-medium text-foreground">{action.title}</p>
                            <p className="text-xs text-muted-foreground">{action.description}</p>
                          </div>
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Register your farm to track bird mortality</p>
                    </TooltipContent>
                  </Tooltip>
                );
              }
              
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
              const disabled = isActionDisabled(action.id);
              
              if (disabled) {
                return (
                  <Tooltip key={action.id}>
                    <TooltipTrigger asChild>
                      <span className="inline-block w-full">
                        <Button 
                          variant="ghost" 
                          disabled 
                          className="w-full flex items-center space-x-3 p-3 h-auto justify-start opacity-50 cursor-not-allowed pointer-events-none" 
                          data-testid={`button-${action.id}-disabled`}
                        >
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${action.color} opacity-50`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-medium text-foreground">{action.title}</p>
                            <p className="text-xs text-muted-foreground">{action.description}</p>
                          </div>
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Register your farm to track feed consumption</p>
                    </TooltipContent>
                  </Tooltip>
                );
              }
              
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
              const disabled = isActionDisabled(action.id);
              
              if (disabled) {
                return (
                  <Tooltip key={action.id}>
                    <TooltipTrigger asChild>
                      <span className="inline-block w-full">
                        <Button 
                          variant="ghost" 
                          disabled 
                          className="w-full flex items-center space-x-3 p-3 h-auto justify-start opacity-50 cursor-not-allowed pointer-events-none" 
                          data-testid={`button-${action.id}-disabled`}
                        >
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${action.color} opacity-50`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-medium text-foreground">{action.title}</p>
                            <p className="text-xs text-muted-foreground">{action.description}</p>
                          </div>
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Register your farm to record sales</p>
                    </TooltipContent>
                  </Tooltip>
                );
              }
              
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
              const disabled = isActionDisabled(action.id);
              
              if (disabled) {
                return (
                  <Tooltip key={action.id}>
                    <TooltipTrigger asChild>
                      <span className="inline-block w-full">
                        <Button 
                          variant="ghost" 
                          disabled 
                          className="w-full flex items-center space-x-3 p-3 h-auto justify-start opacity-50 cursor-not-allowed pointer-events-none" 
                          data-testid={`button-${action.id}-disabled`}
                        >
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${action.color} opacity-50`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-medium text-foreground">{action.title}</p>
                            <p className="text-xs text-muted-foreground">{action.description}</p>
                          </div>
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Register your farm to track health records</p>
                    </TooltipContent>
                  </Tooltip>
                );
              }
              
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
    </TooltipProvider>
  );
}