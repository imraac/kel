import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import {
  insertFlockSchema,
  insertDailyRecordSchema,
  insertSaleSchema,
  insertFeedInventorySchema,
  insertHealthRecordSchema,
  insertExpenseSchema
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
      const validatedData = insertFlockSchema.parse(req.body);
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
      const validatedData = insertDailyRecordSchema.parse({
        ...req.body,
        userId: req.user.claims.sub
      });
      const record = await storage.createDailyRecord(validatedData);
      res.status(201).json(record);
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

  const httpServer = createServer(app);
  return httpServer;
}
