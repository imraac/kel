import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Phone, Mail, Globe, Search, ShoppingCart, Users } from "lucide-react";
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

export default function PublicMarketplace() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const { data: farms = [], isLoading: farmsLoading } = useQuery<Farm[]>({
    queryKey: ['/api/public/farms'],
  });

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['/api/public/products'],
  });

  // Filter farms based on search term
  const filteredFarms = farms.filter(farm =>
    farm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    farm.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    farm.specialization.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter products based on category
  const filteredProducts = products.filter(product =>
    selectedCategory === "all" || product.category === selectedCategory
  );

  // Get unique categories
  const categories = ["all", ...Array.from(new Set(products.map(p => p.category)))];

  if (farmsLoading || productsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <Skeleton className="h-12 w-80 mx-auto" />
            <Skeleton className="h-6 w-96 mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
          Poultry Marketplace
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Discover fresh, quality poultry products from verified farms in your area. 
          Connect directly with local farmers for the best prices and freshest products.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-lg mx-auto">
          <Link to="/customer-registration">
            <Button size="lg" className="w-full sm:w-auto" data-testid="button-register">
              <Users className="mr-2 h-4 w-4" />
              Join as Customer
            </Button>
          </Link>
          <Link to="/farm-registration">
            <Button variant="outline" size="lg" className="w-full sm:w-auto" data-testid="button-farm-register">
              Register Your Farm
            </Button>
          </Link>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search farms, locations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48" data-testid="select-category">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category === "all" ? "All Categories" : category.charAt(0).toUpperCase() + category.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Featured Farms */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Featured Farms
          </h2>
          <Badge variant="secondary" data-testid="text-farm-count">
            {filteredFarms.length} farms available
          </Badge>
        </div>

        {filteredFarms.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                No farms found matching your search criteria.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFarms.map((farm) => (
              <Card key={farm.id} className="hover:shadow-lg transition-shadow" data-testid={`card-farm-${farm.id}`}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span data-testid={`text-farm-name-${farm.id}`}>{farm.name}</span>
                    <Badge variant="outline">{farm.specialization}</Badge>
                  </CardTitle>
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <MapPin className="mr-1 h-3 w-3" />
                    <span data-testid={`text-farm-location-${farm.id}`}>{farm.location}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                    {farm.description || "Premium quality poultry products from local farm."}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center">
                      <Users className="mr-2 h-4 w-4 text-gray-400" />
                      <span>{farm.totalBirds.toLocaleString()} birds</span>
                    </div>
                    <div className="flex items-center">
                      <ShoppingCart className="mr-2 h-4 w-4 text-gray-400" />
                      <span>{farm.avgEggsPerDay.toLocaleString()} eggs/day</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    {farm.contactPhone && (
                      <div className="flex items-center">
                        <Phone className="mr-1 h-3 w-3 text-gray-400" />
                        <span>{farm.contactPhone}</span>
                      </div>
                    )}
                    {farm.contactEmail && (
                      <div className="flex items-center">
                        <Mail className="mr-1 h-3 w-3 text-gray-400" />
                        <span className="truncate">{farm.contactEmail}</span>
                      </div>
                    )}
                    {farm.website && (
                      <div className="flex items-center">
                        <Globe className="mr-1 h-3 w-3 text-gray-400" />
                        <a href={farm.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          Website
                        </a>
                      </div>
                    )}
                  </div>

                  <Link to={`/farm/${farm.id}`}>
                    <Button className="w-full" data-testid={`button-view-farm-${farm.id}`}>
                      View Farm & Products
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Featured Products */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Featured Products
          </h2>
          <Badge variant="secondary" data-testid="text-product-count">
            {filteredProducts.length} products available
          </Badge>
        </div>

        {filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                No products found in the selected category.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredProducts.slice(0, 8).map((product) => {
              const farm = farms.find(f => f.id === product.farmId);
              return (
                <Card key={product.id} className="hover:shadow-md transition-shadow" data-testid={`card-product-${product.id}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base" data-testid={`text-product-name-${product.id}`}>
                      {product.name}
                    </CardTitle>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">{product.category}</Badge>
                      <span className="text-lg font-semibold text-green-600" data-testid={`text-product-price-${product.id}`}>
                        ${product.currentPrice}/{product.unit}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {farm && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        by {farm.name}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mb-3">
                      Min order: {product.minOrderQuantity} {product.unit}
                    </p>
                    <p className="text-xs text-gray-500 mb-3">
                      In stock: {product.stockQuantity} {product.unit}
                    </p>
                    {product.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                        {product.description}
                      </p>
                    )}
                    {farm && (
                      <Link to={`/farm/${farm.id}`}>
                        <Button size="sm" className="w-full" data-testid={`button-view-product-farm-${product.id}`}>
                          View Farm
                        </Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Call to Action */}
      <Card className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950 dark:to-green-950">
        <CardContent className="text-center py-8">
          <h3 className="text-xl font-semibold mb-2">Ready to Start Shopping?</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Register as a customer to place orders and connect with local farmers.
          </p>
          <Link to="/customer-registration">
            <Button size="lg" data-testid="button-cta-register">
              Get Started Today
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}