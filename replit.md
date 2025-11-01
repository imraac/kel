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