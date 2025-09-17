import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sprout, Egg, BarChart3, Shield, ShoppingCart, Users } from "lucide-react";

export default function Landing() {
  const handleLogin = (roleIntent?: string) => {
    // Store user's role intent for post-login routing
    if (roleIntent) {
      sessionStorage.setItem('userRoleIntent', roleIntent);
    }
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
              <Sprout className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4">
            RoblePoultryPilot
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Comprehensive poultry farm management platform with integrated marketplace for tracking layers production from chicks to eggs, customer interactions, and order management.
          </p>
          <div className="space-y-4">
            <Button size="lg" onClick={() => handleLogin()} data-testid="button-sign-in" className="text-lg px-8 py-6">
              Sign In
            </Button>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleLogin('farmer')} 
                data-testid="button-farmer-intent"
                className="px-6 py-3"
              >
                <Users className="w-4 h-4 mr-2" />
                I'm a Farmer
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleLogin('customer')} 
                data-testid="button-customer-intent"
                className="px-6 py-3"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                I'm a Customer
              </Button>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <Card data-testid="card-feature-brooding">
            <CardHeader>
              <div className="w-12 h-12 bg-chart-3/10 rounded-lg flex items-center justify-center mb-4">
                <Sprout className="w-6 h-6 text-chart-3" />
              </div>
              <CardTitle>Chick Brooding</CardTitle>
              <CardDescription>
                Track temperature, lighting, mortality, and feed from day-old chicks through the brooding period.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card data-testid="card-feature-production">
            <CardHeader>
              <div className="w-12 h-12 bg-chart-2/10 rounded-lg flex items-center justify-center mb-4">
                <Egg className="w-6 h-6 text-chart-2" />
              </div>
              <CardTitle>Egg Production</CardTitle>
              <CardDescription>
                Monitor daily egg collection, sales tracking, and production performance with automated alerts.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card data-testid="card-feature-marketplace">
            <CardHeader>
              <div className="w-12 h-12 bg-chart-4/10 rounded-lg flex items-center justify-center mb-4">
                <ShoppingCart className="w-6 h-6 text-chart-4" />
              </div>
              <CardTitle>Marketplace</CardTitle>
              <CardDescription>
                Connect with customers, manage orders, and sell your farm products through our integrated marketplace.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card data-testid="card-feature-analytics">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Analytics & Reports</CardTitle>
              <CardDescription>
                Comprehensive dashboard with charts, trends, and insights to optimize your farm operations.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Key Benefits */}
        <Card className="max-w-4xl mx-auto" data-testid="card-benefits">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Why Choose RoblePoultryPilot?</CardTitle>
            <CardDescription>Built specifically for Kenyan poultry farmers managing large-scale layer operations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Role-Based Access</h3>
                  <p className="text-sm text-muted-foreground">
                    Secure multi-user system with admin and staff roles for proper data management.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-chart-3/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-4 h-4 text-chart-3" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Real-time Monitoring</h3>
                  <p className="text-sm text-muted-foreground">
                    Live dashboards with alerts for production drops, feed shortages, and health issues.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-chart-2/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Egg className="w-4 h-4 text-chart-2" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Complete Lifecycle Tracking</h3>
                  <p className="text-sm text-muted-foreground">
                    From day-old chicks to mature laying hens, track every aspect of your operation.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Sprout className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Mobile-First Design</h3>
                  <p className="text-sm text-muted-foreground">
                    Optimized for use on the farm with responsive design for all devices.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-16 text-muted-foreground">
          <p>Ready to optimize your poultry farm operations?</p>
          <Button variant="outline" onClick={() => handleLogin()} className="mt-4" data-testid="button-login-footer">
            Sign In to Get Started
          </Button>
        </div>
      </div>
    </div>
  );
}
