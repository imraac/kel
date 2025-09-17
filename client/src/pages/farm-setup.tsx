import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { insertFarmSchema, type InsertFarm } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Building2, Phone, Mail, MapPin, Award, Users, CheckCircle, ArrowRight, 
  Sprout, Target, BarChart3, ShoppingCart, Heart, Star
} from "lucide-react";
import { z } from "zod";

// Custom form schema to handle UI fields that need transformation
const farmSetupSchema = insertFarmSchema.extend({
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  country: z.string().min(1, "Country is required"),
  acceptTerms: z.boolean().refine(val => val === true, "You must accept the terms")
}).omit({ location: true }); // We'll construct location from city and state

type FarmFormData = z.infer<typeof farmSetupSchema>;

export function FarmSetupPage() {
  const [, setLocation] = useLocation();
  const [isSuccess, setIsSuccess] = useState(false);
  const [registeredFarmName, setRegisteredFarmName] = useState("");
  const [currentStep, setCurrentStep] = useState(1);
  const { toast } = useToast();

  const form = useForm<FarmFormData>({
    resolver: zodResolver(farmSetupSchema),
    defaultValues: {
      name: "",
      description: "",
      contactEmail: "",
      contactPhone: "",
      address: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
      specialization: "layers",
      totalBirds: 0,
      certifications: "",
      website: "",
      acceptTerms: false
    }
  });

  const createFarmMutation = useMutation({
    mutationFn: (farmData: InsertFarm) =>
      apiRequest("POST", "/api/farms", farmData),
    onSuccess: (farm) => {
      // SECURITY FIX: Invalidate both farms and user context to update farmId/role
      queryClient.invalidateQueries({ queryKey: ["/api/farms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      setRegisteredFarmName((farm as any)?.name || 'your farm');
      setIsSuccess(true);
      toast({
        title: "🎉 Welcome to RoblePoultryPilot!",
        description: `Your farm setup is complete. Let's start managing your poultry operations!`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Setup failed",
        description: error.message || "Failed to set up your farm. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FarmFormData) => {
    const { acceptTerms, city, state, postalCode, country, ...farmData } = data;
    
    // Construct location from city and state
    const location = `${city}, ${state}`;
    
    // Construct full address
    const fullAddress = `${data.address}, ${city}, ${state} ${postalCode}, ${country}`;
    
    const submitData: InsertFarm = {
      ...farmData,
      location,
      address: fullAddress
    };
    
    createFarmMutation.mutate(submitData);
  };

  // Success page
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-blue-50 dark:from-green-900/20 dark:via-emerald-900/20 dark:to-blue-900/20 p-4">
        <div className="max-w-3xl mx-auto">
          <Card className="shadow-2xl border-0 bg-white/90 dark:bg-black/90 backdrop-blur-sm">
            <CardContent className="text-center py-16 space-y-8">
              <div className="relative">
                <div className="w-24 h-24 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
                </div>
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-4">
                  <div className="flex space-x-1">
                    {[...Array(3)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <h1 className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                  🎉 Welcome to Your Farm Dashboard!
                </h1>
                <p className="text-xl text-gray-700 dark:text-gray-300 mb-4">
                  Congratulations! Your farm <span className="font-semibold">"{registeredFarmName}"</span> is now set up and ready to go.
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  You're all set to start managing your poultry operations like a pro.
                </p>
              </div>
              
              <div className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950/50 dark:to-green-950/50 p-6 rounded-xl">
                <h3 className="font-semibold text-lg mb-4 flex items-center justify-center">
                  <Target className="h-5 w-5 mr-2" />
                  Your Farm Management Toolkit Is Ready
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                      <Sprout className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <span>Track chick brooding & growth</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                      <BarChart3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span>Monitor egg production & analytics</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                      <ShoppingCart className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <span>Sell products in marketplace</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                      <Heart className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span>Connect with customers</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => window.location.href = "/api/login"}
                  data-testid="button-login-farm"
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Enter Your Farm Dashboard
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  onClick={() => setLocation("/marketplace")}
                  data-testid="button-browse-marketplace"
                >
                  Browse Marketplace First
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-blue-50 dark:from-green-900/20 dark:via-emerald-900/20 dark:to-blue-900/20 p-4">
      <div className="max-w-5xl mx-auto">
        {/* Welcome Hero Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mr-4">
              <Sprout className="h-8 w-8 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
                Welcome to RoblePoultryPilot!
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 mt-2">
                Let's set up your farm and unlock powerful management tools
              </p>
            </div>
          </div>

          {/* Benefits Preview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 max-w-4xl mx-auto">
            <div className="bg-white/80 dark:bg-black/80 backdrop-blur-sm p-4 rounded-lg border">
              <BarChart3 className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <h3 className="font-semibold mb-1">Smart Analytics</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Track production, identify trends, optimize operations
              </p>
            </div>
            <div className="bg-white/80 dark:bg-black/80 backdrop-blur-sm p-4 rounded-lg border">
              <ShoppingCart className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <h3 className="font-semibold mb-1">Marketplace Ready</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Sell directly to customers, manage orders seamlessly
              </p>
            </div>
            <div className="bg-white/80 dark:bg-black/80 backdrop-blur-sm p-4 rounded-lg border">
              <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <h3 className="font-semibold mb-1">Team Management</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Collaborate with staff, assign roles, track activities
              </p>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="max-w-md mx-auto mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Farm Setup Progress</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">Step 1 of 2</span>
            </div>
            <Progress value={50} className="h-2" />
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Just a few details and you'll be ready to manage your farm!
            </p>
          </div>
        </div>

        {/* Main Setup Form */}
        <Card className="shadow-2xl border-0 bg-white/90 dark:bg-black/90 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <CardTitle className="flex items-center justify-center text-2xl">
              <Building2 className="h-6 w-6 mr-3" />
              Tell Us About Your Farm
            </CardTitle>
            <CardDescription className="text-lg">
              Help us customize your experience by sharing some details about your poultry operation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* Farm Identity Section */}
                <div className="space-y-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Your Farm Identity</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        What should we call your farm and what makes it special?
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>What's your farm called? *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., Sunrise Poultry Farm" 
                              data-testid="input-farm-name"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="specialization"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>What type of farm do you run? *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-farm-type">
                                <SelectValue placeholder="Choose your farm's focus" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="layers">Layer Farm (Focus on Egg Production)</SelectItem>
                              <SelectItem value="broilers">Broiler Farm (Focus on Meat Production)</SelectItem>
                              <SelectItem value="mixed">Mixed Farm (Both Eggs & Meat)</SelectItem>
                              <SelectItem value="breeding">Breeding Farm (Raising Chicks)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="totalBirds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>How many birds can your farm house?</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="e.g., 500"
                              data-testid="input-capacity"
                              {...field}
                              value={field.value || 0}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            This helps us scale our analytics to your operation size
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Farm website (if you have one)</FormLabel>
                          <FormControl>
                            <Input 
                              type="url" 
                              placeholder="https://www.yourfarm.com"
                              data-testid="input-website"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tell customers about your farm</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="What makes your farm special? Share your story, farming practices, or what customers should know..."
                            data-testid="textarea-description"
                            className="min-h-[100px]"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          This will appear on your marketplace profile to help customers connect with your brand
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Contact Information Section */}
                <div className="space-y-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                      <Phone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">How Can Customers Reach You?</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        We'll use this to connect you with potential customers
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="contactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Your business email *</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="contact@yourfarm.com"
                              data-testid="input-email"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contactPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone number for customer contact *</FormLabel>
                          <FormControl>
                            <Input 
                              type="tel" 
                              placeholder="+254 712 345 678"
                              data-testid="input-phone"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Location Section */}
                <div className="space-y-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Where Is Your Farm Located?</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Help local customers find you and arrange deliveries
                      </p>
                    </div>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street address *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Your farm's physical address"
                            data-testid="input-address"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., Nairobi"
                              data-testid="input-city"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>County/State *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., Nairobi County"
                              data-testid="input-state"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="postalCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Postal Code *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="00100"
                              data-testid="input-postal-code"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Kenya"
                              data-testid="input-country"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Certifications Section */}
                <div className="space-y-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                      <Award className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Quality Standards & Certifications</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Showcase your farm's quality standards (optional but recommended for customer trust)
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      "Organic Certified",
                      "Free Range",
                      "Cage Free",
                      "Pasture Raised",
                      "Animal Welfare Approved",
                      "Non-GMO Verified",
                      "Humane Certified",
                      "USDA Certified",
                      "ISO 22000",
                      "HACCP Certified"
                    ].map((cert) => (
                      <FormField
                        key={cert}
                        control={form.control}
                        name="certifications"
                        render={({ field }) => {
                          const currentCerts = field.value ? field.value.split(', ').filter(Boolean) : [];
                          const isChecked = currentCerts.includes(cert);
                          
                          return (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg">
                              <FormControl>
                                <Checkbox
                                  data-testid={`checkbox-cert-${cert.toLowerCase().replace(/\s+/g, '-')}`}
                                  checked={isChecked}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      const newCerts = [...currentCerts, cert];
                                      field.onChange(newCerts.join(', '));
                                    } else {
                                      const newCerts = currentCerts.filter((item) => item !== cert);
                                      field.onChange(newCerts.join(', '));
                                    }
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal">
                                {cert}
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Terms and Conditions */}
                <div className="space-y-4 border-t pt-6">
                  <FormField
                    control={form.control}
                    name="acceptTerms"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 bg-blue-50 dark:bg-blue-950/50 p-4 rounded-lg">
                        <FormControl>
                          <Checkbox
                            data-testid="checkbox-accept-terms"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm font-normal">
                            I'm ready to join RoblePoultryPilot and accept the Terms of Service and Privacy Policy *
                          </FormLabel>
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            By setting up your farm, you're agreeing to our marketplace terms and data handling practices
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex gap-4 pt-6">
                  <Button
                    type="submit"
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white text-lg py-6"
                    disabled={createFarmMutation.isPending}
                    data-testid="button-register-farm"
                  >
                    {createFarmMutation.isPending ? (
                      <>Setting up your farm...</>
                    ) : (
                      <>
                        <ArrowRight className="h-5 w-5 mr-2" />
                        Complete Farm Setup
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation("/")}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}