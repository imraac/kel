import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import {
  insertFarmSchema,
  insertFlockSchema,
  insertDailyRecordSchema,
  insertSaleSchema,
  insertFeedInventorySchema,
  insertHealthRecordSchema,
  insertExpenseSchema,
  insertCustomerSchema,
  insertProductSchema,
  insertOrderSchema,
  insertOrderItemSchema,
  insertDeliverySchema,
  insertUserSchema,
  insertManagerUserSchema
} from "@shared/schema";
import { z } from "zod";
import { normalizeNumericFields } from "./utils/numbers";
import { safeDate } from "./utils/dates";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Users routes
  app.get('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      // Allow admins and managers to view users with proper tenant scoping
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !['admin', 'manager'].includes(currentUser.role || '')) {
        return res.status(403).json({ message: "Access denied. Admin or manager role required." });
      }
      
      let users;
      if (currentUser.role === 'admin') {
        // Admins can see all users
        users = await storage.getUsers();
      } else {
        // Managers can only see users from their farm (excluding admins)
        if (!currentUser.farmId) {
          return res.status(400).json({ message: "Manager must be associated with a farm" });
        }
        users = await storage.getUsersByFarm(currentUser.farmId);
      }
      
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Create new user
  app.post('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser || !['admin', 'manager'].includes(currentUser.role || '')) {
        return res.status(403).json({ message: "Access denied. Admin or manager role required." });
      }

      let validatedData;
      
      if (currentUser.role === 'manager') {
        // Managers can only create staff and customers (no managers)
        validatedData = insertManagerUserSchema.parse(req.body);
        // Assign to manager's farm ONLY for staff roles, customers get farmId = null
        if (!currentUser.farmId) {
          return res.status(400).json({ message: "Manager must be associated with a farm" });
        }
        
        if (validatedData.role === 'staff') {
          validatedData.farmId = currentUser.farmId;
        } else if (validatedData.role === 'customer') {
          validatedData.farmId = null;
        }
      } else {
        // Admins can create any role
        validatedData = insertUserSchema.parse(req.body);
        
        // Ensure role is defined before type checking
        if (!validatedData.role) {
          return res.status(400).json({ message: "Role is required" });
        }
        
        // For admins creating non-customer roles, require valid farmId
        if (!['admin', 'customer'].includes(validatedData.role)) {
          if (!validatedData.farmId || typeof validatedData.farmId !== 'string') {
            return res.status(400).json({ 
              message: "Farm ID is required for staff, manager, and farm_owner roles" 
            });
          }
          // Verify the farm exists
          const farm = await storage.getFarmById(validatedData.farmId);
          if (!farm) {
            return res.status(400).json({ message: "Invalid farm ID" });
          }
        } else {
          // Admin and customer roles don't need farmId
          validatedData.farmId = null;
        }
      }

      const newUser = await storage.upsertUser(validatedData);
      res.status(201).json(newUser);
    } catch (error) {
      console.error("Error creating user:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      if (error instanceof Error && error.message.includes('unique')) {
        return res.status(400).json({ message: "Email already exists" });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Farm routes
  app.post('/api/farms', isAuthenticated, async (req: any, res) => {
    try {
      const farmData = insertFarmSchema.parse(req.body);
      const userId = req.user.claims.sub;
      
      // SECURITY: Use atomic transaction to create farm and bind user
      const result = await storage.createFarmWithOwner(farmData, userId);
      
      res.status(201).json({
        farm: result.farm,
        user: result.user,
        message: "Farm registered successfully and user promoted to farm owner"
      });
    } catch (error) {
      console.error("Error creating farm:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid farm data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create farm" });
    }
  });

  app.get('/api/farms', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser) {
        return res.status(403).json({ message: "User not found" });
      }
      
      // SECURITY: Filter farms based on user access permissions
      const farms = await storage.getFarmsByUserAccess(userId, currentUser.role);
      res.json(farms);
    } catch (error) {
      console.error("Error fetching farms:", error);
      res.status(500).json({ message: "Failed to fetch farms" });
    }
  });

  app.get('/api/farms/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser) {
        return res.status(403).json({ message: "User not found" });
      }
      
      const farm = await storage.getFarmById(req.params.id);
      if (!farm) {
        return res.status(404).json({ message: "Farm not found" });
      }
      
      // SECURITY: Only allow admin OR users whose farmId matches the farm
      if (currentUser.role !== 'admin' && currentUser.farmId !== farm.id) {
        return res.status(403).json({ message: "Access denied. You can only view your own farm." });
      }
      
      res.json(farm);
    } catch (error) {
      console.error("Error fetching farm:", error);
      res.status(500).json({ message: "Failed to fetch farm" });
    }
  });

  app.patch('/api/farms/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser) {
        return res.status(403).json({ message: "User not found" });
      }
      
      const farm = await storage.getFarmById(req.params.id);
      if (!farm) {
        return res.status(404).json({ message: "Farm not found" });
      }
      
      // SECURITY: Only allow admin OR users whose farmId matches the farm
      if (currentUser.role !== 'admin' && currentUser.farmId !== farm.id) {
        return res.status(403).json({ message: "Access denied. You can only update your own farm." });
      }
      
      const updates = insertFarmSchema.partial().parse(req.body);
      
      let updatedFarm: any;
      if (currentUser.role === 'admin') {
        // SECURITY: Admins can update all fields including status and isApproved
        updatedFarm = await storage.updateFarm(req.params.id, updates);
      } else {
        // SECURITY: Farm owners can only update specific fields to prevent privilege escalation
        updatedFarm = await storage.updateFarmOwnerFields(req.params.id, updates);
      }
      
      res.json(updatedFarm);
    } catch (error) {
      console.error("Error updating farm:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid farm data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update farm" });
    }
  });

  // SECURITY: Replace vulnerable user-specific endpoint with secure /me endpoint
  app.get('/api/farms/me', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const farms = await storage.getFarmsByUserId(userId);
      res.json(farms);
    } catch (error) {
      console.error("Error fetching user farms:", error);
      res.status(500).json({ message: "Failed to fetch user farms" });
    }
  });

  // Dashboard routes
  app.get('/api/dashboard/metrics', isAuthenticated, async (req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  app.get('/api/dashboard/activity', isAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const activity = await storage.getRecentActivity(limit);
      res.json(activity);
    } catch (error) {
      console.error("Error fetching recent activity:", error);
      res.status(500).json({ message: "Failed to fetch recent activity" });
    }
  });

  // Flock routes
  app.get('/api/flocks', isAuthenticated, async (req, res) => {
    try {
      const flocks = await storage.getFlocks();
      res.json(flocks);
    } catch (error) {
      console.error("Error fetching flocks:", error);
      res.status(500).json({ message: "Failed to fetch flocks" });
    }
  });

  app.post('/api/flocks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser?.farmId) {
        return res.status(400).json({ message: "User must be associated with a farm to create flocks" });
      }

      // Auto-inject farmId and userId for security
      const flockData = {
        ...req.body,
        farmId: currentUser.farmId,
      };

      const validatedData = insertFlockSchema.parse(flockData);
      const flock = await storage.createFlock(validatedData);
      res.status(201).json(flock);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error creating flock:", error);
        res.status(500).json({ message: "Failed to create flock" });
      }
    }
  });

  app.get('/api/flocks/:id', isAuthenticated, async (req, res) => {
    try {
      const flock = await storage.getFlockById(req.params.id);
      if (!flock) {
        return res.status(404).json({ message: "Flock not found" });
      }
      res.json(flock);
    } catch (error) {
      console.error("Error fetching flock:", error);
      res.status(500).json({ message: "Failed to fetch flock" });
    }
  });

  // Update flock
  app.put('/api/flocks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser?.farmId) {
        return res.status(400).json({ message: "User must be associated with a farm to update flocks" });
      }

      // Get the existing flock to verify ownership
      const existingFlock = await storage.getFlockById(req.params.id);
      if (!existingFlock) {
        return res.status(404).json({ message: "Flock not found" });
      }

      // Verify the flock belongs to the user's farm
      if (existingFlock.farmId !== currentUser.farmId) {
        return res.status(403).json({ message: "Access denied. Flock belongs to different farm." });
      }

      // Remove fields that shouldn't be updated by users
      const { id, farmId, createdAt, updatedAt, ...updateData } = req.body;
      
      const validatedData = insertFlockSchema.partial().strip().parse(updateData);
      const updatedFlock = await storage.updateFlock(req.params.id, validatedData);
      res.json(updatedFlock);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error updating flock:", error);
        res.status(500).json({ message: "Failed to update flock" });
      }
    }
  });

  // Deactivate flock (admin-only)
  app.patch('/api/flocks/:id/deactivate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      // Only administrators can deactivate flocks
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Administrator role required to deactivate flocks." });
      }

      // Get the existing flock
      const existingFlock = await storage.getFlockById(req.params.id);
      if (!existingFlock) {
        return res.status(404).json({ message: "Flock not found" });
      }

      // Update the flock status to deactivated
      const deactivatedFlock = await storage.updateFlock(req.params.id, { 
        status: 'deactivated' 
      });
      
      res.json({ 
        message: "Flock deactivated successfully", 
        flock: deactivatedFlock 
      });
    } catch (error) {
      console.error("Error deactivating flock:", error);
      res.status(500).json({ message: "Failed to deactivate flock" });
    }
  });

  // Daily records routes
  app.get('/api/daily-records', isAuthenticated, async (req, res) => {
    try {
      const flockId = req.query.flockId as string;
      const limit = parseInt(req.query.limit as string) || 50;
      const records = await storage.getDailyRecords(flockId, limit);
      res.json(records);
    } catch (error) {
      console.error("Error fetching daily records:", error);
      res.status(500).json({ message: "Failed to fetch daily records" });
    }
  });

  app.post('/api/daily-records', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser) {
        return res.status(403).json({ message: "User not found" });
      }

      if (!currentUser.farmId) {
        return res.status(400).json({ message: "User must be associated with a farm to create records" });
      }

      const validatedData = insertDailyRecordSchema.parse({
        ...req.body,
        userId
      });

      // SECURITY: Validate that the flock belongs to user's farm (tenant isolation)
      const flock = await storage.getFlockById(validatedData.flockId);
      if (!flock) {
        return res.status(404).json({ message: "Flock not found" });
      }
      
      if (flock.farmId !== currentUser.farmId) {
        return res.status(403).json({ message: "Access denied. You can only create records for your own farm's flocks." });
      }

      // Double-entry detection: Check for existing records with same userId + flockId + recordDate
      const existingRecord = await storage.findDailyRecordDuplicate(
        validatedData.userId, 
        validatedData.flockId, 
        validatedData.recordDate
      );

      let record;
      if (existingRecord && existingRecord.reviewStatus === 'approved') {
        // Duplicate found with approved status - flag for review
        const recordWithReview = {
          ...validatedData,
          reviewStatus: 'pending_review' as const,
          isDuplicate: true,
          duplicateOfId: existingRecord.id
        };
        
        // Atomic operation: Create record and notify managers in transaction
        record = await storage.createDailyRecordWithNotification(recordWithReview, flock.farmId, {
          type: 'duplicate_entry',
          title: 'Duplicate Daily Record Detected',
          message: `A potential duplicate daily record has been submitted for ${validatedData.recordDate}. Please review and approve or reject.`,
          meta: {
            duplicateOfId: existingRecord.id,
            flockId: validatedData.flockId,
            submittedBy: userId
          }
        });

        res.status(201).json({ 
          ...record,
          message: "Record submitted for manager review due to potential duplicate."
        });
      } else {
        // No duplicates or previous record was rejected - create normally
        const recordWithReview = {
          ...validatedData,
          reviewStatus: 'approved' as const,
          isDuplicate: false
        };
        
        record = await storage.createDailyRecordWithReview(recordWithReview);
        res.status(201).json(record);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error creating daily record:", error);
        res.status(500).json({ message: "Failed to create daily record" });
      }
    }
  });

  // Sales routes
  app.get('/api/sales', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser?.farmId) {
        return res.status(400).json({ message: "User must be associated with a farm to view sales" });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const sales = await storage.getSalesByFarm(currentUser.farmId, limit);
      res.json(sales);
    } catch (error) {
      console.error("Error fetching sales:", error);
      res.status(500).json({ message: "Failed to fetch sales" });
    }
  });

  app.post('/api/sales', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser?.farmId) {
        return res.status(400).json({ message: "User must be associated with a farm to create sales" });
      }

      // Auto-inject farmId and userId, and coerce numeric fields
      const input = {
        ...req.body,
        userId,
        farmId: currentUser.farmId
      };

      // Validate and normalize numeric fields using centralized utilities
      let normalized;
      try {
        normalized = normalizeNumericFields(input, {
          integers: ['cratesSold'],
          decimals: { pricePerCrate: 2, totalAmount: 2 }
        });
      } catch (error) {
        return res.status(400).json({ message: "Validation error", errors: [(error as Error).message] });
      }

      const validatedData = insertSaleSchema.parse(normalized);
      const sale = await storage.createSale(validatedData);
      res.status(201).json(sale);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error creating sale:", error);
        res.status(500).json({ message: "Failed to create sale" });
      }
    }
  });

  // Feed inventory routes
  app.get('/api/feed-inventory', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser?.farmId) {
        return res.status(400).json({ message: "User must be associated with a farm to view feed inventory" });
      }

      const inventory = await storage.getFeedInventory(currentUser.farmId);
      res.json(inventory);
    } catch (error) {
      console.error("Error fetching feed inventory:", error);
      res.status(500).json({ message: "Failed to fetch feed inventory" });
    }
  });

  app.post('/api/feed-inventory', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser?.farmId) {
        return res.status(400).json({ message: "User must be associated with a farm to add feed inventory" });
      }

      // Auto-inject farmId and userId, and coerce numeric fields
      const input = {
        ...req.body,
        userId,
        farmId: currentUser.farmId
      };

      // Validate and normalize numeric fields using centralized utilities
      let normalized;
      try {
        normalized = normalizeNumericFields(input, {
          decimals: { quantityKg: 2, unitPrice: 2 },
          optional: ['quantityKg', 'unitPrice'],
          returnStrings: true // Return strings for Drizzle schema compatibility
        });
      } catch (error) {
        return res.status(400).json({ message: "Validation error", errors: [(error as Error).message] });
      }

      // Ensure dates are properly formatted as strings (YYYY-MM-DD)
      const feedData = {
        ...normalized,
        purchaseDate: normalized.purchaseDate ? String(normalized.purchaseDate).slice(0, 10) : null,
        expiryDate: normalized.expiryDate ? String(normalized.expiryDate).slice(0, 10) : null
      };

      // Temporary logging for debugging
      console.log("Feed data before validation:", JSON.stringify(feedData, null, 2));

      const validatedData = insertFeedInventorySchema.parse(feedData);
      const feed = await storage.createFeedInventory(validatedData);
      res.status(201).json(feed);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error creating feed inventory:", error);
        res.status(500).json({ message: "Failed to create feed inventory" });
      }
    }
  });

  // Health records routes
  app.get('/api/health-records', isAuthenticated, async (req, res) => {
    try {
      const flockId = req.query.flockId as string;
      const limit = parseInt(req.query.limit as string) || 50;
      const records = await storage.getHealthRecords(flockId, limit);
      res.json(records);
    } catch (error) {
      console.error("Error fetching health records:", error);
      res.status(500).json({ message: "Failed to fetch health records" });
    }
  });

  app.post('/api/health-records', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser?.farmId) {
        return res.status(400).json({ message: "User must be associated with a farm to add health records" });
      }

      // Validate that flockId belongs to user's farm
      if (req.body.flockId) {
        const flock = await storage.getFlockById(req.body.flockId);
        if (!flock || flock.farmId !== currentUser.farmId) {
          return res.status(400).json({ message: "Invalid flock selection" });
        }
      }

      // Auto-inject userId 
      const input = {
        ...req.body,
        userId
      };

      // Defensive coercion: ensure cost field is string for Drizzle schema
      if (typeof input.cost === 'number') {
        input.cost = String(input.cost);
      }
      // Handle empty string for optional cost field
      if (input.cost === '') {
        input.cost = undefined;
      }

      const validatedData = insertHealthRecordSchema.parse(input);
      const record = await storage.createHealthRecord(validatedData);
      res.status(201).json(record);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("=== HEALTH RECORD ZOD VALIDATION ERRORS ===");
        console.error("Raw request body:", JSON.stringify(req.body, null, 2));
        console.error("Cost field details:", req.body?.cost, "type:", typeof req.body?.cost);
        console.error("Zod errors:", JSON.stringify(error.errors, null, 2));
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error creating health record:", error);
        res.status(500).json({ message: "Failed to create health record" });
      }
    }
  });

  // Expense routes
  app.get('/api/expenses', isAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const expenses = await storage.getExpenses(limit);
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.post('/api/expenses', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser?.farmId) {
        return res.status(400).json({ message: "User must be associated with a farm to add expenses" });
      }

      // Auto-inject farmId and userId
      const input = {
        ...req.body,
        userId,
        farmId: currentUser.farmId
      };

      // Defensive coercion: ensure amount field is string for Drizzle schema
      if (typeof input.amount === 'number') {
        input.amount = String(input.amount);
      }
      // Handle empty string for required amount field
      if (input.amount === '') {
        return res.status(400).json({ message: "Amount is required" });
      }

      const validatedData = insertExpenseSchema.parse(input);
      const expense = await storage.createExpense(validatedData);
      res.status(201).json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("=== EXPENSE ZOD VALIDATION ERRORS ===");
        console.error("Raw request body:", JSON.stringify(req.body, null, 2));
        console.error("Amount field details:", req.body?.amount, "type:", typeof req.body?.amount);
        console.error("Zod errors:", JSON.stringify(error.errors, null, 2));
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error creating expense:", error);
        res.status(500).json({ message: "Failed to create expense" });
      }
    }
  });

  // Marketplace routes - Customers
  app.get('/api/customers', isAuthenticated, async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  app.post('/api/customers', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(validatedData);
      res.status(201).json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error creating customer:", error);
        res.status(500).json({ message: "Failed to create customer" });
      }
    }
  });

  app.get('/api/customers/:id', isAuthenticated, async (req, res) => {
    try {
      const customer = await storage.getCustomerById(req.params.id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Error fetching customer:", error);
      res.status(500).json({ message: "Failed to fetch customer" });
    }
  });

  app.patch('/api/customers/:id', isAuthenticated, async (req: any, res) => {
    try {
      const updates = insertCustomerSchema.partial().parse(req.body);
      const customer = await storage.updateCustomer(req.params.id, updates);
      res.json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error updating customer:", error);
        res.status(500).json({ message: "Failed to update customer" });
      }
    }
  });

  // Marketplace routes - Products
  app.get('/api/products', isAuthenticated, async (req: any, res) => {
    try {
      // For now, return all products as they may be used in marketplace
      // Individual farms can filter their own products client-side if needed
      const products = await storage.getProducts();
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.post('/api/products', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser?.farmId) {
        return res.status(400).json({ message: "User must be associated with a farm to add products" });
      }

      // Auto-inject farmId
      const input = {
        ...req.body,
        farmId: currentUser.farmId
      };

      // Defensive coercion: ensure currentPrice field is string for Drizzle schema
      if (typeof input.currentPrice === 'number') {
        input.currentPrice = String(input.currentPrice);
      }
      // Handle empty string for required currentPrice field
      if (input.currentPrice === '') {
        return res.status(400).json({ message: "Current price is required" });
      }

      const validatedData = insertProductSchema.parse(input);
      const product = await storage.createProduct(validatedData);
      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error creating product:", error);
        res.status(500).json({ message: "Failed to create product" });
      }
    }
  });

  app.get('/api/products/:id', isAuthenticated, async (req, res) => {
    try {
      const product = await storage.getProductById(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  app.patch('/api/products/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser?.farmId) {
        return res.status(400).json({ message: "User must be associated with a farm to update products" });
      }

      // Validate that product belongs to user's farm
      const existingProduct = await storage.getProductById(req.params.id);
      if (!existingProduct) {
        return res.status(404).json({ message: "Product not found" });
      }
      if (existingProduct.farmId !== currentUser.farmId) {
        return res.status(403).json({ message: "Unauthorized to update this product" });
      }

      // Defensive coercion: ensure currentPrice field is string for Drizzle schema
      const input = { ...req.body };
      if (typeof input.currentPrice === 'number') {
        input.currentPrice = String(input.currentPrice);
      }

      const updates = insertProductSchema.partial().parse(input);
      const product = await storage.updateProduct(req.params.id, updates);
      res.json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error updating product:", error);
        res.status(500).json({ message: "Failed to update product" });
      }
    }
  });

  // Marketplace routes - Orders  
  app.get('/api/orders', isAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const orders = await storage.getOrders(limit);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  // SECURE: New order creation with server-side pricing and inventory validation
  app.post('/api/orders', isAuthenticated, async (req: any, res) => {
    try {
      const { items, ...orderData } = req.body;
      
      const userId = req.user.claims.sub;
      console.log('Debug - userId:', userId);
      const currentUser = await storage.getUser(userId);
      console.log('Debug - currentUser:', currentUser);
      console.log('Debug - currentUser.farmId:', currentUser?.farmId);
      
      if (!currentUser?.farmId) {
        console.log('Debug - No farmId found for user, rejecting request');
        return res.status(400).json({ message: "User must be associated with a farm to create orders" });
      }
      
      // Validate the order data structure
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Order must contain at least one item" });
      }

      // Validate required fields
      if (!orderData.customerId) {
        return res.status(400).json({ message: "Customer ID is required" });
      }
      if (!orderData.deliveryMethod) {
        return res.status(400).json({ message: "Delivery method is required" });
      }

      // Validate items structure
      for (const item of items) {
        if (!item.productId || !item.quantity || item.quantity <= 0) {
          return res.status(400).json({ message: "Each item must have a valid productId and positive quantity" });
        }
      }

      // Create order with server-side pricing and inventory validation
      const result = await storage.createOrderWithItems({
        ...orderData,
        farmId: currentUser.farmId,
        userId: userId,
        items
      });

      res.status(201).json({
        message: "Order created successfully",
        order: result.order,
        orderItems: result.orderItems,
        totalAmount: result.totalAmount
      });

    } catch (error) {
      console.error("Error creating order:", error);
      
      if (error instanceof Error) {
        if (error.message.includes('validation failed') || 
            error.message.includes('Insufficient stock') ||
            error.message.includes('not found')) {
          res.status(400).json({ message: error.message });
        } else {
          res.status(500).json({ message: "Failed to create order" });
        }
      } else {
        res.status(500).json({ message: "Failed to create order" });
      }
    }
  });

  app.get('/api/orders/:id', isAuthenticated, async (req, res) => {
    try {
      const order = await storage.getOrderById(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.json(order);
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  app.patch('/api/orders/:id', isAuthenticated, async (req: any, res) => {
    try {
      // Only allow updating certain fields for security
      const allowedUpdates = ['status', 'paymentStatus', 'paidAmount', 'deliveryMethod', 'deliveryAddress', 'notes'];
      const updates = Object.keys(req.body).reduce((acc: any, key) => {
        if (allowedUpdates.includes(key)) {
          acc[key] = req.body[key];
        }
        return acc;
      }, {});

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }

      const order = await storage.updateOrder(req.params.id, updates);
      res.json(order);
    } catch (error) {
      console.error("Error updating order:", error);
      res.status(500).json({ message: "Failed to update order" });
    }
  });

  // Marketplace routes - Order Items
  app.get('/api/orders/:orderId/items', isAuthenticated, async (req, res) => {
    try {
      const orderItems = await storage.getOrderItems(req.params.orderId);
      res.json(orderItems);
    } catch (error) {
      console.error("Error fetching order items:", error);
      res.status(500).json({ message: "Failed to fetch order items" });
    }
  });

  // SECURITY: Disabled separate order item creation to prevent pricing manipulation
  // Order items must now be created through the secure /api/orders endpoint
  app.post('/api/order-items', isAuthenticated, async (req: any, res) => {
    res.status(400).json({ 
      message: "Direct order item creation is disabled for security. Create orders with items using POST /api/orders endpoint.",
      error: "PRICING_SECURITY_POLICY"
    });
  });

  // Marketplace routes - Deliveries
  app.get('/api/deliveries', isAuthenticated, async (req, res) => {
    try {
      const deliveries = await storage.getDeliveries();
      res.json(deliveries);
    } catch (error) {
      console.error("Error fetching deliveries:", error);
      res.status(500).json({ message: "Failed to fetch deliveries" });
    }
  });

  app.post('/api/deliveries', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertDeliverySchema.parse(req.body);
      const delivery = await storage.createDelivery(validatedData);
      res.status(201).json(delivery);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error creating delivery:", error);
        res.status(500).json({ message: "Failed to create delivery" });
      }
    }
  });

  app.patch('/api/deliveries/:id', isAuthenticated, async (req: any, res) => {
    try {
      const updates = insertDeliverySchema.partial().parse(req.body);
      const delivery = await storage.updateDelivery(req.params.id, updates);
      res.json(delivery);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error updating delivery:", error);
        res.status(500).json({ message: "Failed to update delivery" });
      }
    }
  });

  // ========================================
  // PUBLIC API ENDPOINTS (No Authentication Required)
  // ========================================

  // Public farms directory - List all active farms
  app.get('/api/public/farms', async (req, res) => {
    try {
      const farms = await storage.getPublicFarms(); // Only approved, active farms
      res.json(farms);
    } catch (error) {
      console.error("Error fetching public farms:", error);
      res.status(500).json({ message: "Failed to fetch farms" });
    }
  });

  // Public farm details - Individual farm information
  app.get('/api/public/farms/:id', async (req, res) => {
    try {
      const farm = await storage.getPublicFarmById(req.params.id);
      if (!farm) {
        return res.status(404).json({ message: "Farm not found" });
      }
      res.json(farm);
    } catch (error) {
      console.error("Error fetching public farm:", error);
      res.status(500).json({ message: "Failed to fetch farm details" });
    }
  });

  // Public products by farm - Products available from a specific farm
  app.get('/api/public/farms/:farmId/products', async (req, res) => {
    try {
      const products = await storage.getPublicProductsByFarm(req.params.farmId);
      res.json(products);
    } catch (error) {
      console.error("Error fetching farm products:", error);
      res.status(500).json({ message: "Failed to fetch farm products" });
    }
  });

  // Public products directory - All available products
  app.get('/api/public/products', async (req, res) => {
    try {
      const products = await storage.getPublicProducts();
      res.json(products);
    } catch (error) {
      console.error("Error fetching public products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  // Protected customer profile endpoints
  app.get('/api/customers/me', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const customer = await storage.getCustomerByUserId(userId);
      
      if (!customer) {
        return res.status(404).json({ message: "Customer profile not found" });
      }
      
      res.json(customer);
    } catch (error) {
      console.error("Error fetching customer profile:", error);
      res.status(500).json({ message: "Failed to fetch customer profile" });
    }
  });

  app.post('/api/customers/me', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;
      
      // SECURITY: Never trust client-provided email/userId - always use authenticated claims
      const validatedData = insertCustomerSchema.omit({ email: true }).parse({
        ...req.body,
        status: 'active'  // Auto-activate authenticated customers
      });
      
      // Force server-side identity from authenticated claims
      const customerData = {
        ...validatedData,
        email: userEmail.toLowerCase(), // Use authenticated user's email (normalized)
      };
      
      // Log for debugging (redact sensitive data in production)
      console.log(`Creating customer profile for user ${userId} with email domain: ${userEmail.split('@')[1]}`);
      if (req.body.email && req.body.email !== userEmail) {
        console.warn(`Client provided email '${req.body.email}' ignored, using claims email for security`);
      }
      
      // Create or update customer profile for authenticated user
      const customer = await storage.upsertCustomerForUser(userId, customerData);
      res.status(201).json(customer);
    } catch (error) {
      console.error("Error creating/updating customer profile:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create customer profile" });
      }
    }
  });

  app.put('/api/customers/me', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;
      
      // Check if customer profile exists
      const existingCustomer = await storage.getCustomerByUserId(userId);
      if (!existingCustomer) {
        return res.status(404).json({ message: "Customer profile not found. Use POST to create." });
      }
      
      // Validate customer data but ignore client-provided email/userId
      const validatedData = insertCustomerSchema.parse({
        ...req.body,
        email: userEmail, // Use authenticated user's email
        status: 'active'  // Maintain active status
      });
      
      // Update customer profile
      const customer = await storage.updateCustomer(existingCustomer.id, validatedData);
      res.json(customer);
    } catch (error) {
      console.error("Error updating customer profile:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update customer profile" });
      }
    }
  });

  // Customer orders endpoint - Get authenticated customer's orders
  app.get('/api/customers/orders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get customer profile first
      const customer = await storage.getCustomerByUserId(userId);
      if (!customer) {
        return res.status(404).json({ message: "Customer profile not found" });
      }
      
      // Get customer's orders
      const orders = await storage.getOrdersByCustomer(customer.id);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching customer orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  // Customer deliveries endpoint - Get authenticated customer's deliveries  
  app.get('/api/customers/deliveries', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get customer profile first
      const customer = await storage.getCustomerByUserId(userId);
      if (!customer) {
        return res.status(404).json({ message: "Customer profile not found" });
      }
      
      // Get customer's orders first, then their deliveries
      const orders = await storage.getOrdersByCustomer(customer.id);
      const orderIds = orders.map(order => order.id);
      
      // Get deliveries for all customer orders
      const deliveries = [];
      for (const orderId of orderIds) {
        const delivery = await storage.getDeliveryByOrderId(orderId);
        if (delivery) {
          deliveries.push(delivery);
        }
      }
      
      res.json(deliveries);
    } catch (error) {
      console.error("Error fetching customer deliveries:", error);
      res.status(500).json({ message: "Failed to fetch deliveries" });
    }
  });

  // Customer self-registration endpoint
  app.post('/api/public/customers/register', async (req, res) => {
    try {
      const customerData = insertCustomerSchema.parse({
        ...req.body,
        status: 'active', // Auto-activate self-registered customers
        customerType: req.body.customerType || 'retail' // Default to retail
      });
      
      const customer = await storage.createCustomer(customerData);
      res.status(201).json({ 
        message: "Registration successful! You can now browse and place orders.",
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error registering customer:", error);
        res.status(500).json({ message: "Registration failed. Please try again." });
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
