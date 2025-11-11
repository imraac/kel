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
- **Break-Even Analysis**: Dynamic calculation, historical data analysis, and what-if scenarios.
- **Body Weight Tracking**: Advanced analytics with distribution histogram, CV% alerts, and professional reporting.
- **Dynamic Alert System**: Real-time alerts for feed stock, mortality rate, vaccination schedules, and production efficiency drops.
- **Egg Quality Metric**: Real-time quality tracking and classification on the dashboard.
- **Dashboard Enhancement with Weekly Targets**: Displays week number, flock age, and age-based targets for temperature, lighting, feed, and weight.
- **Trend Charts**: Visualizations for expense categories, monthly expenses, and daily production, featuring UTC-consistent date handling and zero-filling for continuity.
- **Multi-Tenant Data Isolation**: Ensures data is correctly scoped to the active farm across all pages for admin users.

## External Dependencies
- **Database Hosting**: Neon PostgreSQL
- **Authentication Provider**: Replit Auth service
- **Development Platform**: Replit
- **Font Services**: Google Fonts (Architects Daughter, DM Sans, Fira Code, Geist Mono)
- **Build & Deployment**: Replit hosting

## Recent Changes

### Break-Even Analysis NaN Fix (November 10, 2025)
- **CRITICAL BUG FIX**: Resolved "KshNaN" display in break-even analysis derived values
- **Root Cause**: Property name mismatch between backend API response and frontend expectations
  - Backend returned: `price`, `unitVariableCost`, `fixedCostsPerMonth`, `initialUnits`, `growthRate`
  - Frontend expected: `averagePrice`, `averageUnitVariableCost`, `averageFixedCostsPerMonth`, `averageMonthlyUnits`, `calculatedGrowthRate`
- **TypeScript Interface Updates** (client/src/pages/reports.tsx):
  - Updated `BreakEvenMetrics` interface derivedValues to match backend API properties
  - Added missing `seasonalityFactors: number[]` field
  - Added complete `dataQuality` interface with all backend response fields
- **Defensive Formatting** (formatCurrency function):
  - Changed signature to accept `number | undefined | null`
  - Added guard: `if (value == null || !isFinite(value)) return "N/A"`
  - Prevents NaN, undefined, null, and Infinity from reaching currency formatter
- **Property Reference Updates**:
  - Fixed all display cards to use correct property names: `.price`, `.unitVariableCost`, `.fixedCostsPerMonth`, `.initialUnits`, `.growthRate`
  - Updated CSV export to use correct properties and improved labels
- **Auto-Recalculation**:
  - Rolling window period selector properly wired with `setRollingWindow`
  - Query key includes `rollingWindow`: `["/api/breakeven/metrics", rollingWindow, activeFarmId]`
  - TanStack Query automatically refetches when period changes (3/6/12 months)
- **Impact**: Break-even derived values now display actual currency and number values instead of "KshNaN", with automatic recalculation when switching time periods
- **Architect Validated**: Comprehensive review confirmed interface matches backend contract, defensive guards prevent NaN display, and period selector triggers automatic refetch

### Sales History Empty State & Farm Context UX Improvements (November 10, 2025)
- **UX ENHANCEMENT**: Improved empty state messaging and farm selection experience for admin users
- **Context-Aware Empty State** (client/src/pages/egg-production.tsx):
  - Sales History tab now shows current farm name in empty state: "No Sales Records for [Farm Name]"
  - Explains why data is missing: "This farm doesn't have any sales data yet"
  - Provides actionable CTAs:
    - "View Demo Farm Data" button - switches to Demo Farm and shows toast (only visible when demo farm exists and user is on different farm)
    - "Record First Sale" button - opens sales dialog to add first sale
  - Uses FarmContext to dynamically detect current farm and demo farm availability
- **Farm Indicator Badge** (client/src/pages/egg-production.tsx):
  - Added badge next to "Egg Production" page title showing current farm name
  - Uses 'default' variant (highlighted) for Demo Farm
  - Uses 'outline' variant for other farms
  - Updates automatically when farm is switched via sidebar selector
- **FarmContext Persistence & Auto-Selection** (client/src/contexts/FarmContext.tsx):
  - **localStorage Persistence**: Admin farm selections now persist across page reloads
  - **Demo Farm Preference**: New admin users automatically land on "🎯 Demo Farm - Sample Data" (if exists) to see example data
  - **Returning User Experience**: Admin users see their last manually selected farm on subsequent logins
  - **Security Hardening**:
    - localStorage only read AFTER role validation (prevents unauthorized farm access during hydration)
    - Saved farm validated against current farms list before restoration
    - ALL setActiveFarmId calls use persistence wrapper to keep localStorage in sync
    - Logout properly clears localStorage to prevent cross-session farm leakage
  - **Persistence Key**: `kukuhub_selected_farm_id` in localStorage
  - **Role Handling**:
    - Admin: Restores last selection (if valid) or prefers Demo Farm, persists manual changes
    - Customer: Clears localStorage, sets farm to null
    - Non-admin farm users: Persists their assigned farmId
- **Impact**: 
  - Users always know which farm they're viewing (badge indicator)
  - Clear guidance when viewing farms without data (context-aware empty state)
  - New admins immediately see sample data instead of empty farms
  - Farm selections survive page reloads and browser sessions
  - No unauthorized farm access or stale data across user sessions
- **Architect Validated**: Three-iteration review confirmed empty state, badge, and FarmContext changes meet requirements without security regressions

### Body Weight Histogram Zero-Range Bug Fix (November 11, 2025)
- **CRITICAL BUG FIX**: Resolved runtime error "Cannot read properties of undefined (reading 'frequency')" in body weight histogram
- **Root Cause**: When all weight records had identical values, the histogram calculation failed
  - `range = max - min = 0`
  - `binWidth = range / binCount = 0`
  - `binIndex = (weight - min) / binWidth = NaN` (division by zero)
  - `bins[NaN]` = undefined → error when accessing `.frequency` property
- **The Fix** (client/src/pages/body-weights.tsx):
  - **Zero-range guard** (lines 195-204): Detects when all weights are identical and returns a single bin with all frequencies
  - **StdDev guard** (lines 225-233): Only calculates normal distribution density when `stdDev > 0` to prevent division by zero
- **Impact**: Weight records with uniform values (e.g., all birds weigh 1kg) now render correctly with a single histogram bar instead of crashing
- **Architect Validated**: Confirmed fix properly handles edge cases, prevents NaN bin indices, and downstream chart components handle single-bin datasets gracefully