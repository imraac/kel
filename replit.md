# KukuHub

## Overview
KukuHub is a comprehensive poultry farm management system designed for tracking layer chickens from chicks to eggs. It offers role-based access for managing farm operations, including brooding, egg production, feed, health, sales, and expense tracking. The system also features a marketplace for farmer-customer interaction, order placement, and delivery management. It provides real-time performance analytics and reporting to optimize poultry farm operations.

## User Preferences
Preferred communication style: Simple, everyday language.

### Development Workflow Requirements

**CRITICAL: Architect Review Before Testing**
- Never proceed with feature testing without first calling the architect to review if everything is working properly
- If architect raises any issues, fix them immediately
- Call architect again for review after fixes
- Only proceed with E2E testing once architect has approved the implementation
- This ensures quality and prevents wasted testing cycles on broken features

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack Query (React Query)
- **UI Components**: Radix UI primitives with shadcn/ui
- **Styling**: Tailwind CSS with CSS variables
- **Build Tool**: Vite

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API
- **Authentication**: Replit Auth with OpenID Connect
- **Session Management**: Express sessions with PostgreSQL storage

### Data Storage
- **Database**: PostgreSQL with Neon serverless provider
- **ORM**: Drizzle ORM
- **Schema Validation**: Zod
- **Migrations**: Drizzle Kit

### Authentication & Authorization
- **Provider**: Replit Auth with OIDC
- **Session Storage**: PostgreSQL-backed sessions
- **Role-Based Access**: Admin and staff roles
- **Security**: HTTP-only cookies, secure session handling, CSRF protection

### Key Features Architecture
- **Dashboard**: Real-time metrics and analytics.
- **Flock Management**: Lifecycle tracking from brooding to production.
- **Daily Records**: Temperature, lighting, mortality, and production logging.
- **Sales Tracking**: Egg sales, pricing, and customer management.
- **Feed Inventory**: Stock levels, consumption, and low-stock alerts.
- **Health Records**: Vaccination, treatments, and veterinary care tracking.
- **Expense Management**: Operating cost tracking and categorization.
- **Reporting**: Comprehensive analytics with filtering and export.
- **User Management**: Multi-tenant role-based access control.
- **Marketplace**: Customer-facing ordering system.
- **Break-Even Analysis**: Dynamic calculation from sales and expenses, with historical data analysis and what-if scenarios.
- **Body Weight Tracking**: Advanced analytics with distribution histogram, CV% alerts, and professional reporting.
- **Dynamic Alert System**: Real-time alerts for feed stock, mortality rate, vaccination schedules, and production efficiency drops.
- **Egg Quality Metric**: Real-time quality tracking and classification on the dashboard.
- **Dashboard Enhancement with Weekly Targets**: Displays week number, flock age, and age-based targets for temperature, lighting, feed, and weight.

## External Dependencies
- **Database Hosting**: Neon PostgreSQL
- **Authentication Provider**: Replit Auth service
- **Development Platform**: Replit
- **Font Services**: Google Fonts (Architects Daughter, DM Sans, Fira Code, Geist Mono)
- **Build & Deployment**: Replit hosting

## Recent Changes

### Category Trends Chart Implementation (November 10, 2025)
- **NEW FEATURE**: Implemented Category Trends stacked bar chart on Expenses page
- **Visualization**: Stacked BarChart showing last 6 months of spending by category
- **Categories**: Feed, Medication, Labor, Utilities, Equipment, Other (dynamically detected)
- **Data Processing**:
  - UTC-consistent date handling with `getMonthKey()` and `formatMonthDisplay()`
  - Aggregates expenses by month AND category
  - Zero-fills missing categories per month for continuous visualization
  - Last 6 calendar months vs 12 months for Expense Trends
- **Chart Features**:
  - Stacked bars (stackId="a") with distinct colors per category
  - Y-axis in thousands format (e.g., "100k", "1400k")
  - X-axis shows month abbreviations (e.g., "Nov", "Dec")
  - Interactive tooltip with currency formatting (KSh)
  - Legend with capitalized category names
  - Colors use theme CSS variables (chart-1 through chart-5, muted for "other")
- **Empty State**: Displays helpful message when no expense data exists
- **E2E Tested**: Playwright test verified chart rendering, stacking, tooltips, and data continuity
- **Location**: Expenses page → Category tab (data-testid="card-category-trends")

### Expense Trends & Production Trends Charts Implementation (November 10, 2025)
- **NEW FEATURE**: Implemented standalone chart visualizations for Expense Trends and Production Trends pages
- **Expense Trends Chart (Expenses Page)**:
  - AreaChart showing monthly expenses for last 12 calendar months
  - Full UTC consistency using `getUTCFullYear()` and `getUTCMonth()` for date processing
  - Date range filtering with explicit start/end boundaries in UTC
  - Zero-filling for missing months to ensure continuous 12-month view
  - Conditional date parsing handling both YYYY-MM-DD and ISO timestamp formats
  - Empty state displayed when no expense data available
  - Data Structure: `{ monthKey: string, month: string, amount: number }`
- **Production Trends Chart (Egg Production Page)**:
  - LineChart showing daily egg collection and crate production for last 30 days
  - Dual-metric visualization: "Eggs Collected" (primary color) and "Crates Produced" (chart-2 color)
  - Full UTC consistency for daily date processing using `getUTCDate()` in addition to year/month
  - Daily aggregation: Sums multiple records per day before charting
  - Zero-filling for missing days in 30-day window
  - Explicit `hasProductionActivity` flag to detect all-zero data
  - Empty state with informative message when no production data exists
  - Data Structure: `{ dateKey: string, date: string, eggs: number, crates: number }`
- **UTC Consistency Pattern** (applied to both charts after multiple iterations):
  - All Date objects created with `Date.UTC()` for boundary calculations
  - All getters use UTC versions: `getUTCFullYear()`, `getUTCMonth()`, `getUTCDate()`
  - Date parsing differentiates: `dateStr.includes('T') ? new Date(dateStr) : new Date(\`${dateStr}T00:00:00Z\`)`
  - Display formatting uses explicit `timeZone: 'UTC'` option
  - Prevents timezone drift, boundary exclusion, and cross-timezone inconsistencies
- **Authentication Bug Fix**:
  - Fixed `upsertUser` function to use `target: users.id` instead of `users.email`
  - Prevents duplicate key errors when same OIDC user logs in multiple times
  - OIDC `sub` claim maps to primary key `users.id`
- **Architect Validated**: Both chart implementations reviewed and approved with UTC consistency patterns
- **Visual Consistency**: Charts use HSL CSS variables, ResponsiveContainer, CartesianGrid, proper tooltips and legends

### Authentication Fix - Email Unique Constraint Removed (November 10, 2025)
- **CRITICAL BUG FIX**: Removed `.unique()` constraint from `users.email` field
- **Root Cause**: OIDC identity is determined by `sub` claim (maps to `users.id`), not email
- **Issue**: Multiple OIDC identities with same email caused duplicate key violation and server crash
- **Solution**: Email can now be duplicated; `users.id` (OIDC sub) is sole unique identifier
- **Migration**: Applied via `npm run db:push --force`
- **Impact**: Prevents authentication crashes, aligns with OIDC best practices
- **Storage**: `upsertUser` already correctly used `target: users.id` (no changes needed)

### Production Trends & Forecasts Charts Implementation (November 2025)
- **NEW FEATURE**: Fully implemented Production Trends and Trends & Forecasts charts with actual data visualizations
- **Production Trends Chart**: 
  - LineChart showing daily egg production and crates over selected period (30/60/90 days)
  - Filters data by selectedPeriod using stable date processing
  - Empty state displayed when no production data available
- **Trends & Forecasts Tab**:
  - Production Trend Analysis: BarChart displaying monthly egg production (last 12 months)
  - Revenue Forecasting: LineChart with revenue/expenses/profit including 3-month forecast
  - Forecast data marked with dashed lines for clear distinction
  - Dynamic Key Insights section with calculated metrics
- **Data Processing Enhancements**:
  - Normalized month keys to stable yyyy-mm format for reliable sorting
  - Added division-by-zero guards for production change calculation
  - Growth rate calculation protects against zero/missing revenue
  - Monthly aggregation from daily records, sales, and expenses
- **Demo Data Improvements (seed script)**:
  - Gradual price growth: 380 → 405 KES over 52 weeks (6.5% annual growth)
  - Reduced price variance to ±5% for stability
  - Reduced feed expenses from 250k to 220k per week with tighter variance
  - Ensures consistently profitable trends with positive break-even projections
- **Architect Validated**: Comprehensive review confirmed data processing correctness, chart implementations, and profitability logic
- **E2E Tested**: Playwright tests passed verifying chart rendering, tab navigation, and no NaN/Infinity values in UI

### Farm Selector Multi-Tenant Data Isolation Fix (November 2025)
- **CRITICAL BUG FIX**: Resolved farm selector not updating dashboard data when admins switch farms
- **Backend Storage Updates**: Updated `getDashboardMetrics()` and `getRecentActivity()` to require and filter by farmId parameter
  - Active flocks filtered by `eq(flocks.farmId, farmId)`
  - Daily records filtered by farm's flockIds using SQL IN clause
  - Feed inventory filtered by `eq(feedInventory.farmId, farmId)`
  - Sales revenue (current & last month) filtered by `eq(sales.farmId, farmId)` with date ranges
  - Recent activity filtered by farm's flockIds
- **Backend Route Updates**: Dashboard routes (`/api/dashboard/metrics`, `/api/dashboard/activity`) now extract farmId via `requireFarmContext()` and pass to storage methods
- **Frontend Context Fix**: Fixed FarmContext useEffect dependency array - removed `activeFarmId` to prevent infinite loops when `setActiveFarmId` is called
- **Proper Multi-Tenant Scoping**: Admin users can now switch farms via dropdown and immediately see data update for the selected farm
- **Architect Validated**: Comprehensive review confirmed dashboard metrics and activity properly scope to selected farm with no stale data issues

### Complete Farm Switching Fix - All Pages (November 10, 2025)
- **CRITICAL BUG FIX**: Systematically resolved farm switching not refreshing data across ALL application pages
- **Root Cause**: Frontend queries missing `activeFarmId` in query keys and `credentials: 'include'` in fetch calls
- **Complete Fix Applied to 7 Pages**:
  1. **Egg Production**: All queries now include activeFarmId in keys, credentials in fetches, proper enabled guards
  2. **Chick Brooding**: Queries and mutation invalidations updated with activeFarmId scoping + credentials
  3. **Health Records**: Queries and mutation invalidations updated with activeFarmId scoping + credentials
  4. **Feed Management**: Queries and mutation invalidations updated with activeFarmId scoping + credentials
  5. **Body Weights**: Queries and mutation invalidations updated with activeFarmId scoping + credentials
  6. **Expenses**: Queries and mutation invalidations updated with activeFarmId scoping + credentials
  7. **Reports**: All 5 queries (dailyRecords, sales, expenses, feedInventory, breakEvenMetrics) include activeFarmId + credentials
- **Consistent Pattern Applied Across All Pages**:
  - Query keys: `["/api/endpoint", activeFarmId]` for proper cache scoping
  - Fetch calls: `credentials: 'include'` for session cookie transmission
  - Enabled conditions: `isAuthenticated && hasActiveFarm && !!activeFarmId`
  - Mutation invalidations: `{ queryKey: ["/api/endpoint", activeFarmId] }` matching query keys exactly
- **Impact**: Admin users can now switch farms via dropdown and ALL pages immediately refresh with correct farm-scoped data
- **Architect Validated**: Comprehensive multi-iteration review confirmed all 7 pages have complete, consistent farm switching support with no credential omissions or typos