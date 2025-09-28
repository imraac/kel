// Route constants to prevent routing conflicts and make navigation explicit
export const ROUTES = {
  // Public routes
  LANDING: "/",
  MARKETPLACE: "/marketplace",
  FARM_STOREFRONT: "/farm",
  CUSTOMER_REGISTRATION: "/customer-registration",
  FARM_REGISTRATION: "/farm-registration",
  FARM_SETUP: "/farm-setup",
  
  // Farm management routes (always accessible)
  BODY_WEIGHTS: "/body-weights",
  
  // Customer routes
  CUSTOMER_DASHBOARD: "/",
  
  // Authenticated farm management routes
  DASHBOARD: "/",
  CHICK_BROODING: "/chick-brooding",
  EGG_PRODUCTION: "/egg-production",
  FEED_MANAGEMENT: "/feed-management",
  HEALTH_RECORDS: "/health-records",
  REPORTS: "/reports",
  EXPENSES: "/expenses",
  USERS: "/users",
  SETTINGS: "/settings",
  
  // Marketplace management routes
  MARKETPLACE_CUSTOMERS: "/marketplace/customers",
  MARKETPLACE_PRODUCTS: "/marketplace/products",
  MARKETPLACE_ORDERS: "/marketplace/orders",
} as const;

// Farm management routes that should never be redirected away from
export const FARM_MANAGEMENT_ROUTES = [
  ROUTES.BODY_WEIGHTS,
  ROUTES.CHICK_BROODING,
  ROUTES.EGG_PRODUCTION,
  ROUTES.FEED_MANAGEMENT,
  ROUTES.HEALTH_RECORDS,
  ROUTES.REPORTS,
  ROUTES.EXPENSES,
  ROUTES.USERS,
  ROUTES.MARKETPLACE_CUSTOMERS,
  ROUTES.MARKETPLACE_PRODUCTS,
  ROUTES.MARKETPLACE_ORDERS,
] as const;