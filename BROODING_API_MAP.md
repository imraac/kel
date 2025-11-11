# 🐣 KukuHub Brooding Records API Documentation
## Complete API Map for Mobile App Integration

---

## 📋 TABLE OF CONTENTS
1. [Authentication](#authentication)
2. [Flock Management APIs](#flock-management-apis)
3. [Daily Brooding Records APIs](#daily-brooding-records-apis)
4. [Data Models & Validation](#data-models--validation)
5. [Error Handling Standards](#error-handling-standards)
6. [Farm Context & Multi-Tenancy](#farm-context--multi-tenancy)

---

## 🔐 AUTHENTICATION

All API endpoints require authentication via Replit Auth (OIDC).

### Headers Required
```http
Cookie: connect.sid=<session_id>
Content-Type: application/json
```

### Authentication Flow
1. User logs in via `/api/login` (redirects to Replit Auth)
2. Callback at `/api/auth/callback` sets session cookie
3. All subsequent requests include session cookie
4. Get current user: `GET /api/auth/user`

### User Context
```typescript
interface User {
  id: string;              // OIDC sub (unique identifier)
  email: string;
  firstName: string;
  lastName: string;
  profileImageUrl: string;
  role: 'admin' | 'farm_owner' | 'manager' | 'staff' | 'customer';
  farmId: string | null;   // null for customers and global admins
  createdAt: string;
  updatedAt: string;
}
```

---

## 🐔 FLOCK MANAGEMENT APIs

### 1. GET /api/flocks
**Description:** Retrieve all flocks for the authenticated user's farm

**Query Parameters:**
```typescript
{
  farmId?: string;              // Required for admin users
  includeDeactivated?: boolean; // Admin-only (default: false)
}
```

**Request Example:**
```http
GET /api/flocks?farmId=8c8d660e-9680-4a45-b6cd-3f4084bbe69f
```

**Response (200 OK):**
```json
[
  {
    "id": "14c3f8c7-61e2-4e81-8c17-66d9be455d2f",
    "farmId": "8c8d660e-9680-4a45-b6cd-3f4084bbe69f",
    "name": "Flock A - Week 1",
    "breed": "Rhode Island Red",
    "initialCount": 500,
    "currentCount": 495,
    "hatchDate": "2025-01-01",
    "status": "brooding",
    "createdAt": "2025-01-01T08:00:00Z",
    "updatedAt": "2025-01-10T10:30:00Z"
  }
]
```

**Possible Errors:**
```json
// 401 Unauthorized
{
  "message": "Unauthorized"
}

// 403 Forbidden (non-admin trying to access deactivated flocks)
{
  "message": "Access denied. Administrator role required to view deactivated flocks."
}

// 500 Server Error
{
  "message": "Failed to fetch flocks"
}
```

**Flock Status Values:**
- `brooding` - Chicks in brooding phase (0-8 weeks)
- `laying` - Mature hens in production
- `retired` - Older hens no longer productive
- `deactivated` - Archived/removed flocks (admin-only visibility)

---

### 2. POST /api/flocks
**Description:** Create a new flock

**Request Body:**
```typescript
{
  name: string;           // Required (e.g., "Flock A - Week 1")
  breed?: string;         // Optional (e.g., "Rhode Island Red")
  initialCount: number;   // Required, >= 0
  currentCount: number;   // Required, >= 0
  hatchDate: string;      // Required, ISO date (YYYY-MM-DD)
  status?: string;        // Optional, default: "brooding"
  farmId?: string;        // Optional for non-admins (auto-injected from user context)
}
```

**Validation Rules:**
```
⚠️ DATA TYPE ISSUE IDENTIFIED!
- name: Must be non-empty string
- initialCount: Must be integer >= 0
- currentCount: Must be integer >= 0, <= initialCount
- hatchDate: Must be valid ISO date string (YYYY-MM-DD)
- status: Must be one of: "brooding", "laying", "retired", "deactivated"
```

**Request Example:**
```json
{
  "name": "Flock B - Week 1",
  "breed": "Leghorn",
  "initialCount": 300,
  "currentCount": 300,
  "hatchDate": "2025-02-01",
  "status": "brooding"
}
```

**Response (201 Created):**
```json
{
  "id": "new-flock-uuid",
  "farmId": "8c8d660e-9680-4a45-b6cd-3f4084bbe69f",
  "name": "Flock B - Week 1",
  "breed": "Leghorn",
  "initialCount": 300,
  "currentCount": 300,
  "hatchDate": "2025-02-01",
  "status": "brooding",
  "createdAt": "2025-02-01T08:00:00Z",
  "updatedAt": "2025-02-01T08:00:00Z"
}
```

**Possible Errors:**
```json
// 400 Bad Request - Validation Error
{
  "message": "Validation error",
  "errors": [
    {
      "code": "too_small",
      "minimum": 0,
      "type": "number",
      "inclusive": true,
      "exact": false,
      "message": "Number must be greater than or equal to 0",
      "path": ["initialCount"]
    }
  ]
}

// 400 Bad Request - Admin without farmId
{
  "message": "Admin must specify farmId in request body or query parameter"
}

// 403 Forbidden
{
  "message": "User not found"
}

// 500 Server Error
{
  "message": "Failed to create flock"
}
```

---

### 3. GET /api/flocks/:id
**Description:** Get details of a specific flock

**Path Parameters:**
- `id` - Flock UUID

**Request Example:**
```http
GET /api/flocks/14c3f8c7-61e2-4e81-8c17-66d9be455d2f
```

**Response (200 OK):**
```json
{
  "id": "14c3f8c7-61e2-4e81-8c17-66d9be455d2f",
  "farmId": "8c8d660e-9680-4a45-b6cd-3f4084bbe69f",
  "name": "Flock A - Week 1",
  "breed": "Rhode Island Red",
  "initialCount": 500,
  "currentCount": 495,
  "hatchDate": "2025-01-01",
  "status": "brooding",
  "createdAt": "2025-01-01T08:00:00Z",
  "updatedAt": "2025-01-10T10:30:00Z"
}
```

**Possible Errors:**
```json
// 404 Not Found
{
  "message": "Flock not found"
}

// 500 Server Error
{
  "message": "Failed to fetch flock"
}
```

---

### 4. PUT /api/flocks/:id
**Description:** Update an existing flock

**Path Parameters:**
- `id` - Flock UUID

**Request Body:** (All fields optional)
```typescript
{
  name?: string;
  breed?: string;
  initialCount?: number;
  currentCount?: number;
  hatchDate?: string;
  status?: string;
}
```

**Security:** 
- Admins can update any flock
- Non-admins can only update flocks belonging to their farm

**Request Example:**
```json
{
  "currentCount": 490,
  "status": "laying"
}
```

**Response (200 OK):**
```json
{
  "id": "14c3f8c7-61e2-4e81-8c17-66d9be455d2f",
  "farmId": "8c8d660e-9680-4a45-b6cd-3f4084bbe69f",
  "name": "Flock A - Week 1",
  "breed": "Rhode Island Red",
  "initialCount": 500,
  "currentCount": 490,
  "hatchDate": "2025-01-01",
  "status": "laying",
  "createdAt": "2025-01-01T08:00:00Z",
  "updatedAt": "2025-03-15T14:20:00Z"
}
```

**Possible Errors:**
```json
// 403 Forbidden - User not found
{
  "message": "User not found"
}

// 403 Forbidden - Cross-farm access attempt
{
  "message": "Access denied. Flock belongs to different farm."
}

// 404 Not Found
{
  "message": "Flock not found"
}

// 500 Server Error
{
  "message": "Failed to update flock"
}
```

---

### 5. PATCH /api/flocks/:id/deactivate
**Description:** Deactivate a flock (Admin-only)

**Path Parameters:**
- `id` - Flock UUID

**Authorization:** Admin role required

**Request Example:**
```http
PATCH /api/flocks/14c3f8c7-61e2-4e81-8c17-66d9be455d2f/deactivate
```

**Response (200 OK):**
```json
{
  "message": "Flock deactivated successfully",
  "flock": {
    "id": "14c3f8c7-61e2-4e81-8c17-66d9be455d2f",
    "status": "deactivated",
    "updatedAt": "2025-03-15T14:30:00Z"
  }
}
```

**Possible Errors:**
```json
// 403 Forbidden - Non-admin user
{
  "message": "Access denied. Administrator role required to deactivate flocks."
}

// 404 Not Found
{
  "message": "Flock not found"
}

// 400 Bad Request - Already deactivated
{
  "message": "Flock is already deactivated."
}

// 500 Server Error
{
  "message": "Failed to deactivate flock"
}
```

---

### 6. PATCH /api/flocks/:id/reactivate
**Description:** Reactivate a deactivated flock (Admin-only)

**Path Parameters:**
- `id` - Flock UUID

**Authorization:** Admin role required

**Request Example:**
```http
PATCH /api/flocks/14c3f8c7-61e2-4e81-8c17-66d9be455d2f/reactivate
```

**Response (200 OK):**
```json
{
  "message": "Flock reactivated successfully",
  "flock": {
    "id": "14c3f8c7-61e2-4e81-8c17-66d9be455d2f",
    "status": "brooding",
    "updatedAt": "2025-03-16T09:00:00Z"
  }
}
```

**Possible Errors:**
```json
// 403 Forbidden - Non-admin user
{
  "message": "Access denied. Administrator role required to reactivate flocks."
}

// 404 Not Found
{
  "message": "Flock not found"
}

// 400 Bad Request - Not deactivated
{
  "message": "Flock is not currently deactivated and cannot be reactivated."
}

// 500 Server Error
{
  "message": "Failed to reactivate flock"
}
```

---

## 📝 DAILY BROODING RECORDS APIs

### 1. GET /api/daily-records
**Description:** Retrieve daily brooding records

**Query Parameters:**
```typescript
{
  flockId?: string;  // Filter by flock (optional)
  farmId?: string;   // Required for admin users
  limit?: number;    // Default: 50, max records to return
}
```

**Request Example:**
```http
GET /api/daily-records?flockId=14c3f8c7-61e2-4e81-8c17-66d9be455d2f&limit=30
```

**Response (200 OK):**
```json
[
  {
    "id": "21e75d44-045d-4e83-aa83-e129213a7c55",
    "flockId": "14c3f8c7-61e2-4e81-8c17-66d9be455d2f",
    "recordDate": "2025-01-10",
    "userId": "42692847",
    
    // Egg production (0 during brooding)
    "eggsCollected": 0,
    "brokenEggs": 0,
    "cratesProduced": 0,
    
    // Mortality tracking
    "mortalityCount": 2,
    "mortalityReason": "Weak chicks",
    
    // Feed consumption
    "feedConsumed": "15.50",
    "feedType": "Starter Feed",
    
    // Environmental conditions
    "temperature": "32.50",
    "lightingHours": "18.00",
    
    // Weight monitoring
    "averageWeight": "0.15",
    "sampleSize": 30,
    
    "notes": "Chicks looking healthy, maintained optimal temperature",
    
    // Review system
    "reviewStatus": "approved",
    "isDuplicate": false,
    "duplicateOfId": null,
    "reviewerId": null,
    "reviewNote": null,
    "reviewedAt": null,
    
    "createdAt": "2025-01-10T18:30:00Z",
    "updatedAt": "2025-01-10T18:30:00Z"
  }
]
```

**Possible Errors:**
```json
// 500 Server Error
{
  "message": "Failed to fetch daily records"
}
```

---

### 2. POST /api/daily-records
**Description:** Create a new daily brooding record

**Request Body:**
```typescript
{
  flockId: string;             // Required - UUID of flock
  recordDate: string;          // Required - ISO date (YYYY-MM-DD)
  
  // Egg production (0 for brooding phase)
  eggsCollected?: number;      // Default: 0
  brokenEggs?: number;         // Default: 0
  cratesProduced?: number;     // Default: 0
  
  // Mortality
  mortalityCount?: number;     // Default: 0, >= 0
  mortalityReason?: string;    // Optional
  
  // Feed
  feedConsumed?: number;       // Optional, kg (decimal)
  feedType?: string;           // Optional
  
  // Brooding environment
  temperature?: number;        // Optional, °C (decimal)
  lightingHours?: number;      // Optional, hours (decimal)
  
  // Weight tracking
  averageWeight?: number;      // Optional, kg (decimal)
  sampleSize?: number;         // Optional, number of chicks weighed
  
  notes?: string;              // Optional
}
```

**Validation Rules:**
```
⚠️ DATA TYPE ISSUE IDENTIFIED!

Required Fields:
- flockId: Must be valid UUID string
- recordDate: Must be ISO date string (YYYY-MM-DD)

Numeric Fields (must be >= 0):
- eggsCollected: Integer >= 0
- brokenEggs: Integer >= 0
- cratesProduced: Integer >= 0
- mortalityCount: Integer >= 0
- feedConsumed: Decimal >= 0 (2 decimal places)
- temperature: Decimal (2 decimal places)
- lightingHours: Decimal (2 decimal places)
- averageWeight: Decimal (2 decimal places)
- sampleSize: Integer >= 0

Constraints:
- Cannot create duplicate records for same flock + date
- Flock must exist and belong to user's farm
- recordDate cannot be in the future
```

**Request Example:**
```json
{
  "flockId": "14c3f8c7-61e2-4e81-8c17-66d9be455d2f",
  "recordDate": "2025-01-15",
  "eggsCollected": 0,
  "brokenEggs": 0,
  "cratesProduced": 0,
  "mortalityCount": 1,
  "mortalityReason": "Natural causes",
  "feedConsumed": 18.25,
  "feedType": "Starter Feed",
  "temperature": 31.5,
  "lightingHours": 18.0,
  "averageWeight": 0.18,
  "sampleSize": 30,
  "notes": "Reduced temperature by 0.5°C as chicks are growing"
}
```

**Response (201 Created) - Normal:**
```json
{
  "id": "new-record-uuid",
  "flockId": "14c3f8c7-61e2-4e81-8c17-66d9be455d2f",
  "recordDate": "2025-01-15",
  "userId": "42692847",
  "eggsCollected": 0,
  "brokenEggs": 0,
  "cratesProduced": 0,
  "mortalityCount": 1,
  "mortalityReason": "Natural causes",
  "feedConsumed": "18.25",
  "feedType": "Starter Feed",
  "temperature": "31.50",
  "lightingHours": "18.00",
  "averageWeight": "0.18",
  "sampleSize": 30,
  "notes": "Reduced temperature by 0.5°C as chicks are growing",
  "reviewStatus": "approved",
  "isDuplicate": false,
  "duplicateOfId": null,
  "reviewerId": null,
  "reviewNote": null,
  "reviewedAt": null,
  "createdAt": "2025-01-15T19:00:00Z",
  "updatedAt": "2025-01-15T19:00:00Z"
}
```

**Response (201 Created) - Duplicate Detected:**
```json
{
  "id": "new-record-uuid",
  "flockId": "14c3f8c7-61e2-4e81-8c17-66d9be455d2f",
  "recordDate": "2025-01-15",
  "userId": "42692847",
  "eggsCollected": 0,
  "brokenEggs": 0,
  "cratesProduced": 0,
  "mortalityCount": 1,
  "mortalityReason": "Natural causes",
  "feedConsumed": "18.25",
  "feedType": "Starter Feed",
  "temperature": "31.50",
  "lightingHours": "18.00",
  "averageWeight": "0.18",
  "sampleSize": 30,
  "notes": "Reduced temperature by 0.5°C as chicks are growing",
  "reviewStatus": "pending_review",
  "isDuplicate": true,
  "duplicateOfId": "existing-record-uuid",
  "reviewerId": null,
  "reviewNote": null,
  "reviewedAt": null,
  "createdAt": "2025-01-15T19:00:00Z",
  "updatedAt": "2025-01-15T19:00:00Z",
  "message": "Record submitted for manager review due to potential duplicate."
}
```

**Behavior Notes:**
- **Automatic Flock Update:** When mortalityCount > 0, the flock's currentCount is automatically reduced
- **Duplicate Detection:** System checks for existing records with same userId + flockId + recordDate
- **Review Workflow:** Duplicates are flagged for manager review (`reviewStatus: "pending_review"`)
- **Notification:** Managers receive notification when duplicate is detected

**Possible Errors:**
```json
// 400 Bad Request - Validation Error
{
  "message": "Validation error",
  "errors": [
    {
      "code": "invalid_type",
      "expected": "string",
      "received": "undefined",
      "path": ["flockId"],
      "message": "Required"
    }
  ]
}

// 400 Bad Request - Admin without farmId
{
  "message": "Admin must specify farmId in request body or query parameter"
}

// 403 Forbidden - User not found
{
  "message": "User not found"
}

// 403 Forbidden - Cross-farm access
{
  "message": "Access denied. You can only create records for your own farm's flocks."
}

// 404 Not Found
{
  "message": "Flock not found"
}

// 409 Conflict - Duplicate date constraint
{
  "message": "A daily record already exists for this flock on this date. Please select a different date or edit the existing record."
}

// 500 Server Error
{
  "message": "Failed to create daily record"
}
```

---

## 📊 DATA MODELS & VALIDATION

### Flock Data Model
```typescript
interface Flock {
  id: string;                    // UUID (auto-generated)
  farmId: string;                // UUID (reference to farms table)
  name: string;                  // Flock name
  breed: string | null;          // Chicken breed (optional)
  initialCount: number;          // Starting number of chicks/birds
  currentCount: number;          // Current number (reduced by mortality)
  hatchDate: string;             // ISO date (YYYY-MM-DD)
  status: FlockStatus;           // Current lifecycle status
  createdAt: string;             // ISO timestamp
  updatedAt: string;             // ISO timestamp
}

type FlockStatus = 
  | "brooding"     // 0-8 weeks: Chicks in brooding phase
  | "laying"       // 16+ weeks: Mature hens producing eggs
  | "retired"      // Older hens past peak production
  | "deactivated"; // Archived/removed flocks
```

### Daily Record Data Model
```typescript
interface DailyRecord {
  id: string;                    // UUID (auto-generated)
  flockId: string;               // UUID (reference to flocks table)
  recordDate: string;            // ISO date (YYYY-MM-DD)
  userId: string;                // UUID (user who created record)
  
  // Egg production
  eggsCollected: number | null;  // Total eggs collected
  brokenEggs: number | null;     // Number of broken eggs
  cratesProduced: number | null; // Number of crates (30 eggs/crate)
  
  // Mortality
  mortalityCount: number;        // Number of deaths (default: 0)
  mortalityReason: string | null;// Cause of deaths
  
  // Feed
  feedConsumed: string | null;   // Kg consumed (decimal stored as string)
  feedType: string | null;       // Type of feed used
  
  // Brooding environment
  temperature: string | null;    // Temperature in °C (decimal)
  lightingHours: string | null;  // Hours of light (decimal)
  
  // Weight tracking
  averageWeight: string | null;  // Average weight in kg (decimal)
  sampleSize: number | null;     // Number of birds weighed
  
  notes: string | null;          // Additional observations
  
  // Review system
  reviewStatus: ReviewStatus;    // Approval status
  isDuplicate: boolean;          // Duplicate flag
  duplicateOfId: string | null;  // Reference to original record
  reviewerId: string | null;     // Manager who reviewed
  reviewNote: string | null;     // Review comments
  reviewedAt: string | null;     // ISO timestamp of review
  
  createdAt: string;             // ISO timestamp
  updatedAt: string;             // ISO timestamp
}

type ReviewStatus = 
  | "approved"        // Normal record, no issues
  | "pending_review"  // Awaiting manager review (duplicate detected)
  | "rejected";       // Rejected by manager
```

### Brooding Guidelines by Week

#### Week 1-2 (Days 1-14)
```typescript
{
  temperature: 32-35,     // °C (reduce 0.5°C every 2-3 days)
  lightingHours: 23-24,   // Hours (near continuous)
  feedType: "Starter",    // 20-22% protein
  feedPerBird: 0.015,     // kg/day (~15g)
  expectedWeight: 0.15,   // kg at end of week 2
  mortalityThreshold: 2   // % (> 2% requires attention)
}
```

#### Week 3-4 (Days 15-28)
```typescript
{
  temperature: 28-30,     // °C
  lightingHours: 18-20,   // Hours
  feedType: "Starter",    // 20-22% protein
  feedPerBird: 0.030,     // kg/day (~30g)
  expectedWeight: 0.30,   // kg at end of week 4
  mortalityThreshold: 1   // %
}
```

#### Week 5-6 (Days 29-42)
```typescript
{
  temperature: 24-26,     // °C (ambient)
  lightingHours: 16-18,   // Hours
  feedType: "Grower",     // 18-20% protein
  feedPerBird: 0.045,     // kg/day (~45g)
  expectedWeight: 0.50,   // kg at end of week 6
  mortalityThreshold: 0.5 // %
}
```

#### Week 7-8 (Days 43-56)
```typescript
{
  temperature: 22-24,     // °C (ambient)
  lightingHours: 14-16,   // Hours
  feedType: "Grower",     // 18-20% protein
  feedPerBird: 0.060,     // kg/day (~60g)
  expectedWeight: 0.70,   // kg at end of week 8
  mortalityThreshold: 0.3 // %
}
```

**Transition to Laying Phase:** Week 16+ (point of lay)

---

## ⚠️ ERROR HANDLING STANDARDS

### Error Response Format
All errors follow this consistent structure:
```typescript
{
  message: string;           // Human-readable error description
  errors?: ValidationError[]; // Zod validation errors (400 only)
  code?: string;             // Error code (optional)
}
```

### HTTP Status Codes

#### 200 OK
- Successful GET, PUT, PATCH requests
- Resource retrieved/updated successfully

#### 201 Created
- Successful POST requests
- New resource created

#### 400 Bad Request
```
⚠️ DATA TYPE ISSUE IDENTIFIED!

Causes:
- Invalid data types (string instead of number, etc.)
- Missing required fields
- Negative values where positive required
- Invalid date formats
- Out-of-range values
```

**Example:**
```json
{
  "message": "Validation error",
  "errors": [
    {
      "code": "invalid_type",
      "expected": "number",
      "received": "string",
      "path": ["temperature"],
      "message": "Expected number, received string"
    },
    {
      "code": "too_small",
      "minimum": 0,
      "type": "number",
      "path": ["mortalityCount"],
      "message": "Number must be greater than or equal to 0"
    }
  ]
}
```

#### 401 Unauthorized
```json
{
  "message": "Unauthorized"
}
```
**Cause:** No valid session cookie / not authenticated

**Action:** Redirect to `/api/login`

#### 403 Forbidden
```json
{
  "message": "Access denied. Administrator role required to deactivate flocks."
}
```
**Causes:**
- Insufficient permissions (non-admin trying admin action)
- Cross-farm data access attempt
- User not found in system

#### 404 Not Found
```json
{
  "message": "Flock not found"
}
```
**Causes:**
- Resource doesn't exist
- Invalid UUID
- Resource deleted/deactivated

#### 409 Conflict
```json
{
  "message": "A daily record already exists for this flock on this date. Please select a different date or edit the existing record."
}
```
**Causes:**
- Duplicate unique constraint violation
- Concurrent request conflict

#### 500 Internal Server Error
```json
{
  "message": "Failed to create daily record"
}
```
**Causes:**
- Database connection issues
- Unexpected server errors
- Transaction failures

**Action:** Retry request with exponential backoff

---

## 🏢 FARM CONTEXT & MULTI-TENANCY

### Farm Isolation Rules
All data is scoped to farms for proper multi-tenancy:

1. **Admin Users** (`role: "admin"`)
   - Can access ALL farms
   - MUST provide `farmId` in query/body for data operations
   - Can view/manage deactivated flocks

2. **Farm Staff** (`role: "farm_owner" | "manager" | "staff"`)
   - Can ONLY access their assigned `farmId`
   - `farmId` auto-injected from user context
   - Cannot view other farms' data

3. **Customers** (`role: "customer"`)
   - Have `farmId: null`
   - Cannot create/view brooding records
   - Can only place orders in marketplace

### Farm Context Validation
```typescript
// Middleware checks on every request:
function requireFarmContext(req, user) {
  if (user.role === 'admin') {
    // Admin must provide farmId explicitly
    const farmId = req.query.farmId || req.body.farmId;
    if (!farmId) {
      throw new Error("Admin must specify farmId in request body or query parameter");
    }
    return farmId;
  } else if (user.farmId) {
    // Use user's assigned farm
    return user.farmId;
  } else {
    throw new Error("User is not associated with any farm");
  }
}
```

### Security Checks
Every API request performs:
1. ✅ Authentication (valid session)
2. ✅ Authorization (role-based permissions)
3. ✅ Farm context validation (multi-tenant isolation)
4. ✅ Resource ownership (flock belongs to user's farm)

**Example Flow:**
```
POST /api/daily-records
├─ 1. Check session cookie → userId
├─ 2. Lookup user by userId
├─ 3. Get farmId from user context
├─ 4. Validate flockId exists
├─ 5. Ensure flock.farmId === user's farmId
├─ 6. Create record
└─ 7. Update flock currentCount if mortality
```

---

## 📱 MOBILE APP INTEGRATION GUIDE

### Base URL
```
Production: https://<your-replit-app>.replit.app
Development: http://localhost:5000
```

### Authentication Flow
```typescript
// 1. Redirect to login
window.location.href = '/api/login';

// 2. After callback, check auth status
const response = await fetch('/api/auth/user', {
  credentials: 'include'
});
const user = await response.json();

// 3. Store user context locally
localStorage.setItem('user', JSON.stringify(user));
```

### Making API Requests
```typescript
// Always include credentials for session cookie
const options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include', // CRITICAL: Include session cookie
  body: JSON.stringify(data)
};

const response = await fetch('/api/daily-records', options);
```

### Error Handling Pattern
```typescript
async function createBroodingRecord(data) {
  try {
    const response = await fetch('/api/daily-records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    });
    
    if (response.status === 401) {
      // Redirect to login
      window.location.href = '/api/login';
      return;
    }
    
    if (response.status === 400) {
      // Validation error
      const error = await response.json();
      console.log('⚠️ DATA TYPE ISSUE IDENTIFIED!');
      console.error('Validation errors:', error.errors);
      return { success: false, errors: error.errors };
    }
    
    if (response.status === 409) {
      // Duplicate record
      const error = await response.json();
      alert('Duplicate record: ' + error.message);
      return { success: false, duplicate: true };
    }
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Request failed');
    }
    
    const record = await response.json();
    return { success: true, data: record };
    
  } catch (error) {
    console.error('Network error:', error);
    return { success: false, error: error.message };
  }
}
```

### Data Validation Before Sending
```typescript
function validateBroodingRecord(data) {
  const errors = [];
  
  // Required fields
  if (!data.flockId) {
    errors.push('⚠️ DATA TYPE ISSUE IDENTIFIED! flockId is required');
  }
  
  if (!data.recordDate || !/^\d{4}-\d{2}-\d{2}$/.test(data.recordDate)) {
    errors.push('⚠️ DATA TYPE ISSUE IDENTIFIED! recordDate must be YYYY-MM-DD format');
  }
  
  // Numeric validations
  if (data.mortalityCount !== undefined) {
    const val = Number(data.mortalityCount);
    if (isNaN(val) || val < 0) {
      errors.push('⚠️ DATA TYPE ISSUE IDENTIFIED! mortalityCount must be number >= 0');
    }
  }
  
  if (data.temperature !== undefined) {
    const val = Number(data.temperature);
    if (isNaN(val)) {
      errors.push('⚠️ DATA TYPE ISSUE IDENTIFIED! temperature must be a valid number');
    }
  }
  
  if (data.lightingHours !== undefined) {
    const val = Number(data.lightingHours);
    if (isNaN(val) || val < 0 || val > 24) {
      errors.push('⚠️ DATA TYPE ISSUE IDENTIFIED! lightingHours must be 0-24');
    }
  }
  
  if (data.feedConsumed !== undefined) {
    const val = Number(data.feedConsumed);
    if (isNaN(val) || val < 0) {
      errors.push('⚠️ DATA TYPE ISSUE IDENTIFIED! feedConsumed must be number >= 0');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
```

### Offline Support Strategy
```typescript
// Queue records for later sync
const offlineQueue = [];

async function createRecordWithOfflineSupport(data) {
  if (!navigator.onLine) {
    // Store locally
    offlineQueue.push({
      type: 'CREATE_RECORD',
      data,
      timestamp: Date.now()
    });
    localStorage.setItem('offlineQueue', JSON.stringify(offlineQueue));
    return { success: true, offline: true };
  }
  
  // Try online first
  return await createBroodingRecord(data);
}

// Sync when back online
window.addEventListener('online', async () => {
  const queue = JSON.parse(localStorage.getItem('offlineQueue') || '[]');
  
  for (const item of queue) {
    try {
      await createBroodingRecord(item.data);
      // Remove from queue on success
      queue.shift();
    } catch (error) {
      console.error('Sync failed:', error);
      break; // Stop on first failure
    }
  }
  
  localStorage.setItem('offlineQueue', JSON.stringify(queue));
});
```

---

## 📋 QUICK REFERENCE CHECKLIST

### Before Making API Calls
- [ ] User is authenticated (session cookie present)
- [ ] User role is appropriate for the action
- [ ] farmId is provided (if admin) or available in user context
- [ ] Request body matches expected schema
- [ ] All required fields are present
- [ ] Numeric fields are actual numbers (not strings)
- [ ] Dates are in ISO format (YYYY-MM-DD)
- [ ] Negative values are not sent for counts/amounts
- [ ] `credentials: 'include'` is set in fetch options

### After Receiving Response
- [ ] Check HTTP status code first
- [ ] Handle 401 with redirect to login
- [ ] Parse 400 errors to show validation messages
- [ ] Handle 409 duplicates with user confirmation
- [ ] Log 500 errors for debugging
- [ ] Update local state/cache on success
- [ ] Show user-friendly error messages

### Data Type Validation
```
⚠️ ALWAYS CHECK DATA TYPES BEFORE SENDING!

String fields: name, breed, recordDate, feedType, mortalityReason, notes
Number fields: initialCount, currentCount, mortalityCount, sampleSize, temperature, lightingHours, feedConsumed, averageWeight
UUID fields: id, flockId, farmId, userId
Date fields: recordDate, hatchDate (YYYY-MM-DD format)
Enum fields: status (brooding|laying|retired|deactivated), reviewStatus (approved|pending_review|rejected)
```

---

## 🎯 COMMON USE CASES

### 1. Daily Brooding Routine
**Mobile Flow:**
```
1. User logs in → GET /api/auth/user
2. Select flock → GET /api/flocks
3. Fill form with today's data:
   - Temperature reading
   - Lighting hours
   - Feed consumed
   - Mortality count (if any)
   - Chick weights (sample)
4. Submit → POST /api/daily-records
5. View history → GET /api/daily-records?flockId=xxx&limit=7
```

### 2. New Flock Setup
```
1. User creates flock → POST /api/flocks
   {
     "name": "Flock C - Batch 2025-02",
     "breed": "Rhode Island Red",
     "initialCount": 500,
     "currentCount": 500,
     "hatchDate": "2025-02-01",
     "status": "brooding"
   }
2. First day record → POST /api/daily-records
   {
     "flockId": "<new-flock-id>",
     "recordDate": "2025-02-01",
     "temperature": 35.0,
     "lightingHours": 24.0,
     "feedConsumed": 7.5,
     "feedType": "Starter Feed",
     "notes": "First day - all chicks active and feeding"
   }
```

### 3. Mortality Tracking
```
POST /api/daily-records
{
  "flockId": "xxx",
  "recordDate": "2025-02-10",
  "mortalityCount": 3,
  "mortalityReason": "Weak chicks, culled",
  "temperature": 32.0,
  "lightingHours": 20.0,
  "feedConsumed": 15.0,
  "notes": "Removed weak chicks to prevent disease spread"
}

→ System automatically updates flock.currentCount: 500 - 3 = 497
```

### 4. Transition to Laying Phase
```
PUT /api/flocks/<flock-id>
{
  "status": "laying"
}

→ Now daily records should include egg production:
POST /api/daily-records
{
  "flockId": "xxx",
  "recordDate": "2025-04-01",
  "eggsCollected": 350,
  "brokenEggs": 5,
  "cratesProduced": 11,
  "feedConsumed": 45.0,
  "feedType": "Layer Feed",
  "temperature": 24.0,
  "lightingHours": 16.0
}
```

---

## 📞 SUPPORT & TROUBLESHOOTING

### Common Issues

**Issue:** "Admin must specify farmId"
```
Solution: Add farmId to query string or request body
GET /api/flocks?farmId=<uuid>
or
POST /api/daily-records
{ "farmId": "<uuid>", ...otherData }
```

**Issue:** "Validation error" with unclear message
```
Solution: Check the 'errors' array in response
{
  "message": "Validation error",
  "errors": [
    {
      "path": ["temperature"],
      "message": "Expected number, received string"
    }
  ]
}
→ Convert "32.5" to 32.5 (number)
```

**Issue:** Duplicate record error
```
Solution: This is expected behavior for double-entry protection
- Either change the recordDate
- Or let manager review and approve/reject the duplicate
```

**Issue:** 401 Unauthorized on all requests
```
Solution:
1. Ensure credentials: 'include' in fetch
2. Check session cookie exists
3. Redirect to /api/login if session expired
```

---

**Document Version:** 1.0  
**Last Updated:** November 11, 2025  
**API Version:** v1  
**Base URL:** `/api/*`
