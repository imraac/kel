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
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Building2, Phone, Mail, MapPin, Award, Users, CheckCircle, ArrowLeft } from "lucide-react";
import { z } from "zod";

// Custom form schema to handle UI fields that need transformation
const farmRegistrationSchema = insertFarmSchema.extend({
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  country: z.string().min(1, "Country is required"),
  acceptTerms: z.boolean().refine(val => val === true, "You must accept the terms")
}).omit({ location: true }); // We'll construct location from city and state

type FarmFormData = z.infer<typeof farmRegistrationSchema>;

export function FarmRegistrationPage() {
  const [, setLocation] = useLocation();
  const [isSuccess, setIsSuccess] = useState(false);
  const [registeredFarmName, setRegisteredFarmName] = useState("");
  const { toast } = useToast();

  const form = useForm<FarmFormData>({
    resolver: zodResolver(farmRegistrationSchema),
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
        title: "Farm registered successfully!",
        description: `Welcome to KukuHub! Your farm registration is complete.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.message || "Failed to register farm. Please try again.",
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
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-xl">
            <CardContent className="text-center py-12 space-y-6">
              <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
              <div>
                <h2 className="text-2xl font-bold text-green-600 mb-2">Farm Registration Successful!</h2>
                <p className="text-gray-600 mb-4">
                  Welcome to KukuHub! Your farm "{registeredFarmName}" has been registered successfully.
                </p>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">What's Next?</h3>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 text-left">
                  <li>• Log in to access your farm management dashboard</li>
                  <li>• Set up your flock records and daily operations</li>
                  <li>• Create products to sell in the marketplace</li>
                  <li>• Connect with customers and manage orders</li>
                  <li>• Track production, sales, and analytics</li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  onClick={() => window.location.href = "/api/login"}
                  data-testid="button-login-farm"
                >
                  Login to Your Farm Dashboard
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  onClick={() => setLocation("/marketplace")}
                  data-testid="button-browse-marketplace"
                >
                  Browse Marketplace
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Building2 className="h-12 w-12 text-green-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-900">Farm Registration</h1>
          </div>
          <p className="text-xl text-gray-600">
            Join the KukuHub marketplace and start managing your poultry operations
          </p>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Users className="h-6 w-6 mr-2" />
              Register Your Poultry Farm
            </CardTitle>
            <CardDescription>
              Complete your farm profile to join our marketplace platform and connect with customers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center">
                      <Building2 className="h-5 w-5 mr-2" />
                      Farm Information
                    </h3>
                    
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Farm Name *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter your farm name" 
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
                          <FormLabel>Farm Type *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-farm-type">
                                <SelectValue placeholder="Select farm type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="layers">Layer Farm (Egg Production)</SelectItem>
                              <SelectItem value="broilers">Broiler Farm (Meat Production)</SelectItem>
                              <SelectItem value="mixed">Mixed Farm (Eggs & Meat)</SelectItem>
                              <SelectItem value="breeding">Breeding Farm</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="totalBirds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Farm Capacity (Number of Birds)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="Total bird capacity"
                              data-testid="input-capacity"
                              {...field}
                              value={field.value || 0}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Farm Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Tell customers about your farm, practices, and specialties..."
                              data-testid="textarea-description"
                              className="min-h-[100px]"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center">
                      <Phone className="h-5 w-5 mr-2" />
                      Contact Information
                    </h3>


                    <FormField
                      control={form.control}
                      name="contactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address *</FormLabel>
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
                          <FormLabel>Phone Number *</FormLabel>
                          <FormControl>
                            <Input 
                              type="tel" 
                              placeholder="+1 (555) 123-4567"
                              data-testid="input-phone"
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
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website URL</FormLabel>
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
                </div>

                {/* Address Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center">
                    <MapPin className="h-5 w-5 mr-2" />
                    Farm Address
                  </h3>
                  
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street Address *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Farm physical address"
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
                              placeholder="City"
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
                          <FormLabel>State/Province *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="State"
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
                              placeholder="ZIP/Postal"
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
                              placeholder="Country"
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

                {/* Certifications */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center">
                    <Award className="h-5 w-5 mr-2" />
                    Certifications & Standards
                  </h3>
                  <p className="text-sm text-gray-600">
                    Select any certifications or standards your farm follows (optional)
                  </p>
                  
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
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
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
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            data-testid="checkbox-accept-terms"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm font-normal">
                            I accept the Terms of Service and Privacy Policy *
                          </FormLabel>
                          <p className="text-xs text-gray-500">
                            By registering, you agree to our marketplace terms and data handling practices
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex gap-4">
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={createFarmMutation.isPending}
                    data-testid="button-register-farm"
                  >
                    {createFarmMutation.isPending ? "Registering..." : "Register Farm"}
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