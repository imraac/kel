import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MapPin, Phone, Mail, Globe, Users, ShoppingCart, ArrowLeft, Package, Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Farm {
  id: string;
  name: string;
  description: string;
  location: string;
  address: string;
  contactEmail: string;
  contactPhone: string;
  website?: string;
  totalBirds: number;
  avgEggsPerDay: number;
  specialization: string;
  businessRegistration?: string;
  certifications?: string[];
}

interface Product {
  id: string;
  farmId: string;
  name: string;
  category: string;
  description: string;
  unit: string;
  currentPrice: string;
  minOrderQuantity: number;
  stockQuantity: number;
}

export default function FarmStorefront() {
  const [match, params] = useRoute("/farm/:farmId");
  const farmId = params?.farmId;

  const { data: farm, isLoading: farmLoading } = useQuery<Farm>({
    queryKey: ['/api/public/farms', farmId],
    enabled: !!farmId,
  });

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['/api/public/farms', farmId, 'products'],
    queryFn: () => fetch(`/api/public/farms/${farmId}/products`).then(res => res.json()),
    enabled: !!farmId,
  });

  if (!match) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Farm not found</p>
            <Link to="/marketplace">
              <Button className="mt-4">Back to Marketplace</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (farmLoading || productsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!farm) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              Farm not found or not available for public viewing
            </p>
            <Link to="/marketplace">
              <Button className="mt-4" data-testid="button-back-marketplace">
                Back to Marketplace
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const categoryGroups = products.reduce((groups: Record<string, Product[]>, product) => {
    const category = product.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(product);
    return groups;
  }, {});

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header Navigation */}
      <div className="flex items-center gap-4">
        <Link to="/marketplace">
          <Button variant="ghost" size="sm" data-testid="button-back">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Marketplace
          </Button>
        </Link>
      </div>

      {/* Farm Information */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl mb-2" data-testid="text-farm-name">
                    {farm.name}
                  </CardTitle>
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center">
                      <MapPin className="mr-1 h-4 w-4" />
                      <span data-testid="text-farm-location">{farm.location}</span>
                    </div>
                    <Badge variant="outline">{farm.specialization}</Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">About This Farm</h3>
                <p className="text-gray-600 dark:text-gray-400" data-testid="text-farm-description">
                  {farm.description || "Premium quality poultry products from a trusted local farm committed to sustainable farming practices."}
                </p>
              </div>

              {farm.address && (
                <div>
                  <h3 className="font-semibold mb-2">Location</h3>
                  <p className="text-gray-600 dark:text-gray-400">{farm.address}</p>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Users className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                  <p className="text-sm font-medium">{farm.totalBirds.toLocaleString()}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Total Birds</p>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <ShoppingCart className="h-6 w-6 mx-auto mb-2 text-green-600" />
                  <p className="text-sm font-medium">{farm.avgEggsPerDay.toLocaleString()}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Eggs/Day</p>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Package className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                  <p className="text-sm font-medium">{products.length}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Products</p>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Award className="h-6 w-6 mx-auto mb-2 text-yellow-600" />
                  <p className="text-sm font-medium">Certified</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Quality</p>
                </div>
              </div>

              {farm.certifications && farm.certifications.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Certifications</h3>
                  <div className="flex flex-wrap gap-2">
                    {farm.certifications.map((cert, index) => (
                      <Badge key={index} variant="secondary">
                        {cert}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {farm.contactPhone && (
                <div className="flex items-center">
                  <Phone className="mr-3 h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">Phone</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{farm.contactPhone}</p>
                  </div>
                </div>
              )}
              {farm.contactEmail && (
                <div className="flex items-center">
                  <Mail className="mr-3 h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 break-all">{farm.contactEmail}</p>
                  </div>
                </div>
              )}
              {farm.website && (
                <div className="flex items-center">
                  <Globe className="mr-3 h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">Website</p>
                    <a
                      href={farm.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Visit Website
                    </a>
                  </div>
                </div>
              )}
              {farm.businessRegistration && (
                <div>
                  <p className="text-sm font-medium">Business Registration</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{farm.businessRegistration}</p>
                </div>
              )}

              <Separator />

              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Ready to place an order?
                </p>
                <Link to="/customer-registration">
                  <Button className="w-full" data-testid="button-register-customer">
                    Register as Customer
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Products Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Available Products</h2>
          <Badge variant="secondary" data-testid="text-product-count">
            {products.length} products
          </Badge>
        </div>

        {products.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 dark:text-gray-400 mb-2">
                No products available at the moment
              </p>
              <p className="text-sm text-gray-400">
                Check back later or contact the farm directly
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {Object.entries(categoryGroups).map(([category, categoryProducts]) => (
              <div key={category}>
                <h3 className="text-xl font-semibold mb-4 capitalize">
                  {category}
                  <Badge variant="outline" className="ml-2">
                    {categoryProducts.length}
                  </Badge>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categoryProducts.map((product) => (
                    <Card key={product.id} className="hover:shadow-lg transition-shadow" data-testid={`card-product-${product.id}`}>
                      <CardHeader>
                        <CardTitle className="text-lg" data-testid={`text-product-name-${product.id}`}>
                          {product.name}
                        </CardTitle>
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary">{product.category}</Badge>
                          <span className="text-xl font-bold text-green-600" data-testid={`text-product-price-${product.id}`}>
                            ${product.currentPrice}
                            <span className="text-sm font-normal text-gray-500">/{product.unit}</span>
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {product.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {product.description}
                          </p>
                        )}
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">Min Order</p>
                            <p className="text-gray-600 dark:text-gray-400">
                              {product.minOrderQuantity} {product.unit}
                            </p>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">In Stock</p>
                            <p className="text-gray-600 dark:text-gray-400">
                              {product.stockQuantity} {product.unit}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Contact farm to place order
                          </p>
                          <div className="flex flex-col gap-2">
                            {farm.contactPhone && (
                              <Button variant="outline" size="sm" className="justify-start" data-testid={`button-call-${product.id}`}>
                                <Phone className="mr-2 h-4 w-4" />
                                Call {farm.contactPhone}
                              </Button>
                            )}
                            {farm.contactEmail && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="justify-start"
                                onClick={() => window.location.href = `mailto:${farm.contactEmail}?subject=Order Inquiry: ${product.name}`}
                                data-testid={`button-email-${product.id}`}
                              >
                                <Mail className="mr-2 h-4 w-4" />
                                Send Email
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Call to Action */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950">
        <CardContent className="text-center py-8">
          <h3 className="text-xl font-semibold mb-2">Want to order from {farm.name}?</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Register as a customer to place orders and get updates on new products.
          </p>
          <Link to="/customer-registration">
            <Button size="lg" data-testid="button-cta-register">
              Register as Customer
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}