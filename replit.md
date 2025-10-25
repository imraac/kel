# RoblePoultryPilot

## Overview

RoblePoultryPilot is a comprehensive poultry farm management system designed for tracking layer chickens from chicks to eggs. The application provides role-based access for farm operations management, including brooding, egg production tracking, feed management, health records, sales monitoring, and expense tracking. Additionally, it features a marketplace where farmers and customers can interact, place orders, and manage deliveries. Built with modern web technologies, it offers real-time performance analytics and comprehensive reporting capabilities for efficient poultry farm operations.

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
- **Framework**: React with TypeScript for type safety and modern development practices
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management and caching
- **UI Components**: Radix UI primitives with shadcn/ui design system for consistent, accessible components
- **Styling**: Tailwind CSS with CSS variables for theming and responsive design
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js web framework
- **Language**: TypeScript with ES modules for modern JavaScript features
- **API Design**: RESTful API endpoints with consistent error handling and logging middleware
- **Authentication**: Replit Auth integration with OpenID Connect for secure user authentication
- **Session Management**: Express sessions with PostgreSQL storage using connect-pg-simple

### Data Storage
- **Database**: PostgreSQL with Neon serverless database provider
- **ORM**: Drizzle ORM for type-safe database operations and schema management
- **Schema Validation**: Zod for runtime type checking and form validation
- **Migrations**: Drizzle Kit for database schema migrations and version control

### Authentication & Authorization
- **Provider**: Replit Auth with OIDC (OpenID Connect) protocol
- **Session Storage**: PostgreSQL-backed sessions with configurable TTL
- **Role-Based Access**: Admin and staff roles with different permission levels
- **Security**: HTTP-only cookies, secure session handling, and CSRF protection

### External Dependencies
- **Database Hosting**: Neon PostgreSQL serverless database
- **Authentication Provider**: Replit Auth service
- **Development Platform**: Replit with integrated development environment
- **Font Services**: Google Fonts for typography (Architects Daughter, DM Sans, Fira Code, Geist Mono)
- **Build & Deployment**: Replit hosting with automatic deployment and cartographer integration for development

### Database Security & Data Integrity (Updated September 2025)
- **Foreign Key Constraints**: All tables enforce referential integrity at database level with appropriate CASCADE/RESTRICT behaviors
- **Multi-Tenant Security**: Role-based validation ensures staff/managers belong to farms while customers/admins remain global
- **Enhanced Precision**: Money fields upgraded to DECIMAL(12,2) for better accuracy and future-proofing against inflation
- **Performance Indexing**: Foreign key columns indexed for optimal query performance and constraint validation
- **Data Validation**: CHECK constraints prevent negative values in financial fields and enforce business logic
- **Orphan Prevention**: Database-level constraints prevent orphaned records and maintain data consistency

### Key Features Architecture
- **Dashboard**: Real-time metrics aggregation with performance analytics
- **Flock Management**: Complete lifecycle tracking from brooding to production with data integrity constraints
- **Daily Records**: Temperature, lighting, mortality, and production logging with duplicate prevention
- **Sales Tracking**: Egg sales with pricing and customer management, secured by foreign key relationships
- **Feed Inventory**: Stock levels, consumption tracking, and low-stock alerts with farm-level isolation
- **Health Records**: Vaccination schedules, treatments, and veterinary care tracking linked to specific flocks
- **Expense Management**: Operating cost tracking with categorization and enhanced monetary precision
- **Reporting**: Comprehensive analytics with date range filtering and export capabilities
- **User Management**: Multi-tenant role-based access control with database-enforced farm relationships
- **Marketplace**: Customer-facing ordering system with referential integrity across orders, products, and deliveries

## Recent Changes

### Unified Sales Architecture (September 2025)
- Successfully created and deployed unified SalesForm component with dynamic validation, centralized useSaleMutation hook, and proper type coercion for decimal fields
- Completed replacement of all 3 duplicate sales forms (simple-sales-form, quick-actions, egg-production) with consistent cache invalidation and farm-scoped data handling
- Resolved critical type mismatch issues between client number conversion and server decimal field expectations, achieving successful sales submissions (POST /api/sales 201)

### Dynamic Alert System Integration (September 2025)
- **MAJOR UPGRADE**: Replaced static mock data with dynamic alert system that calculates real-time alerts from actual farm data
- Implemented comprehensive useFarmAlerts hook that fetches from 4 API endpoints: dashboard metrics, feed inventory, daily records, and health records
- **4 Alert Types with Smart Business Logic**:
  1. Feed Stock Low/Critical - Industry-standard 0.11kg/bird consumption calculations
  2. Mortality Rate Above Normal - 14-day average comparison with 1% threshold
  3. Vaccination Due/Overdue - Real scheduled date tracking with 7-day advance warning
  4. **Production Efficiency Drop** - NEW 4th alert detecting 15%+ production declines
- **Real-time Updates**: Comprehensive cache invalidation ensures alerts update immediately when farm data changes
- **Farm-scoped Data**: All alert calculations properly filtered to active farm context
- **Performance**: Leverages existing React Query infrastructure for optimal caching and loading states

### Enhanced Body Weight Tracking with Advanced Alerting (September 2025)
- **CRITICAL ANALYTICS IMPLEMENTED**: Distribution histogram with normal curve overlay using ComposedChart (bars for actual distribution + red line for expected normal curve)
- **COMPREHENSIVE THRESHOLD ALERTING**: CV% alerts >10% with color-coding, weight gain alerts vs breed standards, individual bird classification (Low/High/Normal ±10% of mean)
- **PROFESSIONAL REPORTING**: Enhanced CSV/PDF downloads including mean, StdDev, CV%, uniformity, range alert counts, percentages, and individual bird deviations
- **REAL-TIME CALCULATIONS**: Debounced statistics with breed standard comparisons via /api/weight-records/calculate endpoint
- **VISUAL PERFORMANCE MONITORING**: Color-coded alert panels (red/orange/green) with highlighted warnings above charts
- **PRODUCTION-READY EXPORTS**: CSV with detailed summaries and PDF via browser print dialog for comprehensive record keeping

### Dashboard Performance Metrics - Decimal Formatting Standardization (October 2025)
- **CONSISTENT PRECISION**: All numeric values in "This Week's Performance" card now display with exactly 2 decimal places for professional consistency
- **PERCENTAGE FORMATTING**: All performance metrics (Laying Rate, Feed Efficiency, Mortality Rate, Revenue Target) now show `.toFixed(2)` formatting (e.g., 87.45% instead of 87.45000001%)
- **CURRENCY FORMATTING**: Revenue values use `toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})` to ensure KSh amounts always show cents (e.g., KSh 268,450.00)
- **EGGS PER DAY**: Changed from whole numbers to 2 decimal places for more accurate daily production tracking (e.g., 4,547.32 eggs/day)
- **ENHANCED READABILITY**: Standardized decimal precision improves data interpretation and professional presentation across all dashboard metrics

### Egg Quality Metric - Real-time Quality Tracking (October 2025)
- **NEW 6TH PERFORMANCE METRIC**: Added Egg Quality to "This Week's Performance" dashboard card for real-time quality monitoring
- **AUTOMATIC CALCULATION**: Formula = (Good Eggs / Total Eggs) × 100, where Good Eggs = Eggs Collected - Broken Eggs
- **WEEKLY ANALYSIS**: Uses 7-day rolling window from daily records to track quality trends
- **INDUSTRY TARGET**: 95% quality target (industry standard for commercial egg production)
- **QUALITY CLASSIFICATION BANDS**: Automatic quality grading with color-coded status
  - **Excellent** (≥95%): Green - Industry target met or exceeded
  - **Good** (90-94.99%): Blue - Acceptable quality with minor room for improvement
  - **Fair** (85-89.99%): Yellow - Below target, needs attention
  - **Poor** (<85%): Red - Critical quality issues requiring immediate action
- **VISUAL DISPLAY**: Green progress bar with classification label and egg counts (e.g., "Excellent | 5,200 good / 5,500 total")
- **DATA SAFEGUARDS**: Math.max(0, ...) clamping prevents negative values from data inconsistencies
- **CONSISTENT FORMATTING**: 2 decimal places for percentage values aligned with other performance metrics
- **ZERO-STATE HANDLING**: Shows "No data" with neutral gray color when no eggs have been collected in the tracking period

### Dashboard Enhancement with Weekly Targets (October 2025)
- **CONTEXTUAL INFORMATION**: Added week number (ISO week) and flock age display below the current date in dashboard header
- **AGE-BASED TARGETS**: Dynamic weekly target widgets that adapt to the oldest flock's age, showing critical requirements for the current week
- **FOUR KEY METRICS**: Temperature ranges, lighting hours, feed amounts with protein specifications, and expected weight targets
- **VISUAL INDICATORS**: Color-coded icons (red for temperature, yellow for lighting, green for feed, blue for weight) with compact card layout
- **STAGE AWARENESS**: Automatic detection of flock development stage (Critical Care, Stabilization, Development, Growth, Pre-laying, Layer Prep, Laying Phase)
- **RESPONSIVE DESIGN**: Adaptive grid layout that works across all device sizes (1 column on mobile, 2 on tablet, 4 on desktop)
- **BOUNDARY-SAFE WEEK CALCULATION**: Implemented Math.max(1, Math.floor((age - 1) / 7) + 1) formula for accurate week numbering at day boundaries (prevents off-by-one errors)
- **WEEK-SPECIFIC TARGETS**: Replaced week ranges (9-12, 13-15, 16+) with individual week-by-week lookup table providing precise feed amounts and expected weights for each week
  - Week 9: 52g per bird, 740g expected weight
  - Week 10: 60g per bird, 830-870g expected weight  
  - Week 11: 65g per bird, 920g expected weight
  - Week 12: 75g per bird, 1050g expected weight
  - Week 13: 80g per bird, 1100g expected weight
  - Week 14: 86g per bird, 1210g expected weight
  - Week 15: 92g per bird, 1320g expected weight
- **DYNAMIC WEEK LABELS**: Week labels now show current specific week (e.g., "Week 9: Growth Phase") instead of ranges (e.g., "Weeks 9-12: Growth Phase")

### Body Weight Page Navigation Enhancement (October 2025)
- **SIDEBAR INTEGRATION**: Added missing sidebar component to body weight tracking page for consistent navigation across the application
- **MOBILE RESPONSIVE**: Implemented mobile menu overlay and hamburger button for touch device navigation
- **LAYOUT CONSISTENCY**: Unified page structure with dashboard and other pages using the same header/sidebar wrapper pattern

### Break-Even Analysis - Dynamic Data-Driven Feature (October 2025)
- **AUTO-CALCULATED METRICS**: Automatically aggregates sales and expenses data to calculate break-even point (no manual entry required)
- **ROLLING WINDOWS**: Analyzes 3/6/12 month historical data with configurable lookback period
- **INTELLIGENT CATEGORIZATION**: Auto-categorizes expenses into variable costs (feed, medication) and fixed costs (labor, utilities, equipment)
- **CAGR CALCULATION**: Calculates compound annual growth rate from historical sales trends for accurate projections
- **MISSING DATA HANDLING**: Graceful fallback with actionable suggestions when insufficient data exists
- **INTERACTIVE NAVIGATION**: Direct links to sales, expenses, and feed management pages for data adjustments
- **REAL-TIME REFRESH**: Auto-invalidates cache when user returns from linked pages (React Query integration)
- **OPTIONAL OVERRIDES**: Manual what-if scenario drawer for testing different assumptions without changing actual data
- **NAVIGATION CONSOLIDATION**: Moved Break-Even Analysis into Reports page as a fifth tab (after Trends & Forecasts) for better information architecture and reduced sidebar clutter. Removed standalone /break-even-analysis route and sidebar link.