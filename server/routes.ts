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
  insertDeliverySchema
} from "@shared/schema";
import { z } from "zod";

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

  // Users routes (for driver assignment)
  app.get('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      // Only admins can view all users for driver assignment
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
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
  app.get('/api/sales', isAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const sales = await storage.getSales(limit);
      res.json(sales);
    } catch (error) {
      console.error("Error fetching sales:", error);
      res.status(500).json({ message: "Failed to fetch sales" });
    }
  });

  app.post('/api/sales', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertSaleSchema.parse({
        ...req.body,
        userId: req.user.claims.sub
      });
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
  app.get('/api/feed-inventory', isAuthenticated, async (req, res) => {
    try {
      const inventory = await storage.getFeedInventory();
      res.json(inventory);
    } catch (error) {
      console.error("Error fetching feed inventory:", error);
      res.status(500).json({ message: "Failed to fetch feed inventory" });
    }
  });

  app.post('/api/feed-inventory', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertFeedInventorySchema.parse({
        ...req.body,
        userId: req.user.claims.sub
      });
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
      const validatedData = insertHealthRecordSchema.parse({
        ...req.body,
        userId: req.user.claims.sub
      });
      const record = await storage.createHealthRecord(validatedData);
      res.status(201).json(record);
    } catch (error) {
      if (error instanceof z.ZodError) {
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
      const validatedData = insertExpenseSchema.parse({
        ...req.body,
        userId: req.user.claims.sub
      });
      const expense = await storage.createExpense(validatedData);
      res.status(201).json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
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
  app.get('/api/products', isAuthenticated, async (req, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.post('/api/products', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertProductSchema.parse(req.body);
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
      const updates = insertProductSchema.partial().parse(req.body);
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
        userId: req.user.claims.sub,
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

  const httpServer = createServer(app);
  return httpServer;
}
