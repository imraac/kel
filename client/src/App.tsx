import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
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
import Settings from "@/pages/settings";
import { FarmRegistrationPage } from "@/pages/farm-registration";
import { FarmSetupPage } from "@/pages/farm-setup";
import MarketplaceCustomers from "@/pages/marketplace-customers";
import MarketplaceProducts from "@/pages/marketplace-products";
import MarketplaceOrders from "@/pages/marketplace-orders";
import PublicMarketplace from "@/pages/public-marketplace";
import FarmStorefront from "@/pages/farm-storefront";
import CustomerRegistration from "@/pages/customer-registration";
import CustomerDashboard from "@/pages/customer-dashboard";

function Router() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Global fallback: Handle saved customer registration data from any page
  useEffect(() => {
    const savedFormData = sessionStorage.getItem('customerRegistrationData');
    if (savedFormData && isAuthenticated && !isLoading) {
      // Redirect to customer registration page to complete the flow
      setLocation('/customer-registration');
    }
  }, [isAuthenticated, isLoading, setLocation]);

  // Determine if user is a customer
  const isCustomer = user?.role === 'customer';

  return (
    <Switch>
      {/* Public routes - always accessible */}
      <Route path="/marketplace" component={PublicMarketplace} />
      <Route path="/farm/:farmId" component={FarmStorefront} />
      <Route path="/customer-registration" component={CustomerRegistration} />
      <Route path="/farm-registration" component={FarmRegistrationPage} />
      <Route path="/farm-setup" component={FarmSetupPage} />
      
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : isCustomer ? (
        // Customer-specific routes
        <>
          <Route path="/" component={CustomerDashboard} />
          <Route path="/settings" component={Settings} />
        </>
      ) : !user?.farmId && user?.role !== 'admin' ? (
        // Non-admin farm management users without a farm - redirect to setup
        <Route path="/" component={FarmSetupPage} />
      ) : (
        // Farm management routes (admin, farm_owner, manager, staff with farms)
        <>
          <Route path="/" component={Home} />
          <Route path="/chick-brooding" component={ChickBrooding} />
          <Route path="/egg-production" component={EggProduction} />
          <Route path="/feed-management" component={FeedManagement} />
          <Route path="/health-records" component={HealthRecords} />
          <Route path="/reports" component={Reports} />
          <Route path="/expenses" component={Expenses} />
          <Route path="/users" component={Users} />
          <Route path="/settings" component={Settings} />
          <Route path="/marketplace/customers" component={MarketplaceCustomers} />
          <Route path="/marketplace/products" component={MarketplaceProducts} />
          <Route path="/marketplace/orders" component={MarketplaceOrders} />
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
