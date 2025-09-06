import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";

import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import ChickBrooding from "@/pages/chick-brooding";
import EggProduction from "@/pages/egg-production";
import FeedManagement from "@/pages/feed-management";
import HealthRecords from "@/pages/health-records";
import Reports from "@/pages/reports";
import Expenses from "@/pages/expenses";
import Users from "@/pages/users";
import Marketplace from "@/pages/marketplace";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/chick-brooding" component={ChickBrooding} />
          <Route path="/egg-production" component={EggProduction} />
          <Route path="/feed-management" component={FeedManagement} />
          <Route path="/health-records" component={HealthRecords} />
          <Route path="/marketplace" component={Marketplace} />
          <Route path="/reports" component={Reports} />
          <Route path="/expenses" component={Expenses} />
          <Route path="/users" component={Users} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
