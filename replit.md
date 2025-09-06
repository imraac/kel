# Ali Roble Farm Manager

## Overview

Ali Roble Farm Manager is a comprehensive poultry farm management system designed for tracking layer chickens from chicks to eggs. The application provides role-based access for farm operations management, including brooding, egg production tracking, feed management, health records, sales monitoring, and expense tracking. Built with modern web technologies, it offers real-time performance analytics and comprehensive reporting capabilities for efficient poultry farm operations.

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

### Key Features Architecture
- **Dashboard**: Real-time metrics aggregation with performance analytics
- **Flock Management**: Complete lifecycle tracking from brooding to production
- **Daily Records**: Temperature, lighting, mortality, and production logging
- **Sales Tracking**: Egg sales with pricing and customer management
- **Feed Inventory**: Stock levels, consumption tracking, and low-stock alerts
- **Health Records**: Vaccination schedules, treatments, and veterinary care tracking
- **Expense Management**: Operating cost tracking with categorization
- **Reporting**: Comprehensive analytics with date range filtering and export capabilities
- **User Management**: Role-based access control with user profile management