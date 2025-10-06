# RoblePoultryPilot

## Overview

RoblePoultryPilot is a comprehensive poultry farm management system designed for tracking layer chickens from chicks to eggs. The application provides role-based access for farm operations management, including brooding, egg production tracking, feed management, health records, sales monitoring, and expense tracking. Additionally, it features a marketplace where farmers and customers can interact, place orders, and manage deliveries. Built with modern web technologies, it offers real-time performance analytics and comprehensive reporting capabilities for efficient poultry farm operations.

## User Preferences

Preferred communication style: Simple, everyday language.

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

### Dashboard Enhancement with Weekly Targets (October 2025)
- **CONTEXTUAL INFORMATION**: Added week number (ISO week) and flock age display below the current date in dashboard header
- **AGE-BASED TARGETS**: Dynamic weekly target widgets that adapt to the oldest flock's age, showing critical requirements for the current week
- **FOUR KEY METRICS**: Temperature ranges, lighting hours, feed amounts with protein specifications, and expected weight targets
- **VISUAL INDICATORS**: Color-coded icons (red for temperature, yellow for lighting, green for feed, blue for weight) with compact card layout
- **STAGE AWARENESS**: Automatic detection of flock development stage (Critical Care, Stabilization, Development, Growth, Pre-laying, Layer Prep, Laying Phase)
- **RESPONSIVE DESIGN**: Adaptive grid layout that works across all device sizes (1 column on mobile, 2 on tablet, 4 on desktop)