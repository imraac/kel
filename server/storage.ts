import {
  users,
  flocks,
  dailyRecords,
  sales,
  feedInventory,
  healthRecords,
  expenses,
  customers,
  bookings,
  demandRequests,
  type User,
  type UpsertUser,
  type InsertFlock,
  type Flock,
  type InsertDailyRecord,
  type DailyRecord,
  type InsertSale,
  type Sale,
  type InsertFeedInventory,
  type FeedInventory,
  type InsertHealthRecord,
  type HealthRecord,
  type InsertExpense,
  type Expense,
  type InsertCustomer,
  type Customer,
  type InsertBooking,
  type Booking,
  type InsertDemandRequest,
  type DemandRequest,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Flock operations
  createFlock(flock: InsertFlock): Promise<Flock>;
  getFlocks(): Promise<Flock[]>;
  getFlockById(id: string): Promise<Flock | undefined>;
  updateFlock(id: string, updates: Partial<InsertFlock>): Promise<Flock>;

  // Daily record operations
  createDailyRecord(record: InsertDailyRecord): Promise<DailyRecord>;
  getDailyRecords(flockId?: string, limit?: number): Promise<DailyRecord[]>;
  getDailyRecordsByDateRange(startDate: string, endDate: string): Promise<DailyRecord[]>;
  updateDailyRecord(id: string, updates: Partial<InsertDailyRecord>): Promise<DailyRecord>;

  // Sales operations
  createSale(sale: InsertSale): Promise<Sale>;
  getSales(limit?: number): Promise<Sale[]>;
  getSalesByDateRange(startDate: string, endDate: string): Promise<Sale[]>;

  // Feed inventory operations
  createFeedInventory(feed: InsertFeedInventory): Promise<FeedInventory>;
  getFeedInventory(): Promise<FeedInventory[]>;
  updateFeedInventory(id: string, updates: Partial<InsertFeedInventory>): Promise<FeedInventory>;
  deleteFeedInventory(id: string): Promise<void>;

  // Health record operations
  createHealthRecord(record: InsertHealthRecord): Promise<HealthRecord>;
  getHealthRecords(flockId?: string, limit?: number): Promise<HealthRecord[]>;

  // Expense operations
  createExpense(expense: InsertExpense): Promise<Expense>;
  getExpenses(limit?: number): Promise<Expense[]>;
  getExpensesByDateRange(startDate: string, endDate: string): Promise<Expense[]>;

  // Dashboard analytics
  getDashboardMetrics(): Promise<any>;
  getRecentActivity(limit?: number): Promise<any[]>;

  // Customer operations
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  getCustomers(): Promise<Customer[]>;
  getCustomerById(id: string): Promise<Customer | undefined>;
  updateCustomer(id: string, updates: Partial<InsertCustomer>): Promise<Customer>;

  // Booking operations
  createBooking(booking: InsertBooking): Promise<Booking>;
  getBookings(): Promise<Booking[]>;
  getBookingsByCustomer(customerId: string): Promise<Booking[]>;
  updateBookingStatus(id: string, status: string): Promise<Booking>;

  // Demand request operations
  createDemandRequest(request: InsertDemandRequest): Promise<DemandRequest>;
  getDemandRequests(): Promise<DemandRequest[]>;
  getOpenDemandRequests(): Promise<DemandRequest[]>;
  updateDemandRequestStatus(id: string, status: string, matchedBookingId?: string): Promise<DemandRequest>;

  // Smart matching operations
  runSmartMatching(): Promise<{ matches: number; newBookings: number }>;
  getAvailableEggProduction(): Promise<{ availableCrates: number; projectedDailyProduction: number }>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Flock operations
  async createFlock(flock: InsertFlock): Promise<Flock> {
    const [newFlock] = await db.insert(flocks).values(flock).returning();
    return newFlock;
  }

  async getFlocks(): Promise<Flock[]> {
    return await db.select().from(flocks).orderBy(desc(flocks.createdAt));
  }

  async getFlockById(id: string): Promise<Flock | undefined> {
    const [flock] = await db.select().from(flocks).where(eq(flocks.id, id));
    return flock;
  }

  async updateFlock(id: string, updates: Partial<InsertFlock>): Promise<Flock> {
    const [updatedFlock] = await db
      .update(flocks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(flocks.id, id))
      .returning();
    return updatedFlock;
  }

  // Daily record operations
  async createDailyRecord(record: InsertDailyRecord): Promise<DailyRecord> {
    const [newRecord] = await db.insert(dailyRecords).values(record).returning();
    return newRecord;
  }

  async getDailyRecords(flockId?: string, limit = 50): Promise<DailyRecord[]> {
    let query = db.select().from(dailyRecords);
    
    if (flockId) {
      query = query.where(eq(dailyRecords.flockId, flockId));
    }
    
    return await query.orderBy(desc(dailyRecords.recordDate)).limit(limit);
  }

  async getDailyRecordsByDateRange(startDate: string, endDate: string): Promise<DailyRecord[]> {
    return await db
      .select()
      .from(dailyRecords)
      .where(
        and(
          gte(dailyRecords.recordDate, startDate),
          lte(dailyRecords.recordDate, endDate)
        )
      )
      .orderBy(desc(dailyRecords.recordDate));
  }

  async updateDailyRecord(id: string, updates: Partial<InsertDailyRecord>): Promise<DailyRecord> {
    const [updatedRecord] = await db
      .update(dailyRecords)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(dailyRecords.id, id))
      .returning();
    return updatedRecord;
  }

  // Sales operations
  async createSale(sale: InsertSale): Promise<Sale> {
    const [newSale] = await db.insert(sales).values(sale).returning();
    return newSale;
  }

  async getSales(limit = 50): Promise<Sale[]> {
    return await db.select().from(sales).orderBy(desc(sales.saleDate)).limit(limit);
  }

  async getSalesByDateRange(startDate: string, endDate: string): Promise<Sale[]> {
    return await db
      .select()
      .from(sales)
      .where(
        and(
          gte(sales.saleDate, startDate),
          lte(sales.saleDate, endDate)
        )
      )
      .orderBy(desc(sales.saleDate));
  }

  // Feed inventory operations
  async createFeedInventory(feed: InsertFeedInventory): Promise<FeedInventory> {
    const [newFeed] = await db.insert(feedInventory).values(feed).returning();
    return newFeed;
  }

  async getFeedInventory(): Promise<FeedInventory[]> {
    return await db.select().from(feedInventory).orderBy(desc(feedInventory.createdAt));
  }

  async updateFeedInventory(id: string, updates: Partial<InsertFeedInventory>): Promise<FeedInventory> {
    const [updatedFeed] = await db
      .update(feedInventory)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(feedInventory.id, id))
      .returning();
    return updatedFeed;
  }

  async deleteFeedInventory(id: string): Promise<void> {
    await db.delete(feedInventory).where(eq(feedInventory.id, id));
  }

  // Health record operations
  async createHealthRecord(record: InsertHealthRecord): Promise<HealthRecord> {
    const [newRecord] = await db.insert(healthRecords).values(record).returning();
    return newRecord;
  }

  async getHealthRecords(flockId?: string, limit = 50): Promise<HealthRecord[]> {
    let query = db.select().from(healthRecords);
    
    if (flockId) {
      query = query.where(eq(healthRecords.flockId, flockId));
    }
    
    return await query.orderBy(desc(healthRecords.recordDate)).limit(limit);
  }

  // Expense operations
  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [newExpense] = await db.insert(expenses).values(expense).returning();
    return newExpense;
  }

  async getExpenses(limit = 50): Promise<Expense[]> {
    return await db.select().from(expenses).orderBy(desc(expenses.expenseDate)).limit(limit);
  }

  async getExpensesByDateRange(startDate: string, endDate: string): Promise<Expense[]> {
    return await db
      .select()
      .from(expenses)
      .where(
        and(
          gte(expenses.expenseDate, startDate),
          lte(expenses.expenseDate, endDate)
        )
      )
      .orderBy(desc(expenses.expenseDate));
  }

  // Dashboard analytics
  async getDashboardMetrics(): Promise<any> {
    // Get total birds from all active flocks
    const activeFlocks = await db.select().from(flocks).where(eq(flocks.status, 'laying'));
    const totalBirds = activeFlocks.reduce((sum, flock) => sum + flock.currentCount, 0);

    // Get today's egg production
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = await db
      .select()
      .from(dailyRecords)
      .where(eq(dailyRecords.recordDate, today));
    
    const todayEggs = todayRecords.reduce((sum, record) => sum + (record.eggsCollected || 0), 0);
    const todayCrates = todayRecords.reduce((sum, record) => sum + (record.cratesProduced || 0), 0);

    // Get feed inventory total
    const feedInventoryData = await this.getFeedInventory();
    const totalFeedStock = feedInventoryData.reduce((sum, feed) => sum + parseFloat(feed.quantityKg || '0'), 0);

    // Get monthly revenue
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];
    const monthlySales = await this.getSalesByDateRange(monthStart, monthEnd);
    const monthlyRevenue = monthlySales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount || '0'), 0);

    return {
      totalBirds,
      todayEggs,
      todayCrates,
      totalFeedStock,
      monthlyRevenue,
      layingRate: totalBirds > 0 ? (todayEggs / totalBirds * 100).toFixed(1) : '0'
    };
  }

  async getRecentActivity(limit = 10): Promise<any[]> {
    // Combine recent records from different tables
    const recentRecords = await db
      .select({
        id: dailyRecords.id,
        type: sql`'daily_record'`.as('type'),
        description: sql`CASE 
          WHEN ${dailyRecords.eggsCollected} IS NOT NULL THEN CONCAT('Recorded ', ${dailyRecords.eggsCollected}, ' eggs')
          WHEN ${dailyRecords.mortalityCount} > 0 THEN CONCAT('Recorded ', ${dailyRecords.mortalityCount}, ' mortality')
          WHEN ${dailyRecords.feedConsumed} IS NOT NULL THEN CONCAT('Updated feed consumption: ', ${dailyRecords.feedConsumed}, 'kg')
          ELSE 'Daily record updated'
        END`.as('description'),
        createdAt: dailyRecords.createdAt,
        userId: dailyRecords.userId
      })
      .from(dailyRecords)
      .orderBy(desc(dailyRecords.createdAt))
      .limit(limit);

    return recentRecords;
  }

  // Customer operations
  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [newCustomer] = await db.insert(customers).values(customer).returning();
    return newCustomer;
  }

  async getCustomers(): Promise<Customer[]> {
    return await db.select().from(customers).orderBy(desc(customers.createdAt));
  }

  async getCustomerById(id: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer;
  }

  async updateCustomer(id: string, updates: Partial<InsertCustomer>): Promise<Customer> {
    const [updatedCustomer] = await db
      .update(customers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();
    return updatedCustomer;
  }

  // Booking operations
  async createBooking(booking: InsertBooking): Promise<Booking> {
    const [newBooking] = await db.insert(bookings).values(booking).returning();
    return newBooking;
  }

  async getBookings(): Promise<Booking[]> {
    return await db.select().from(bookings).orderBy(desc(bookings.createdAt));
  }

  async getBookingsByCustomer(customerId: string): Promise<Booking[]> {
    return await db.select().from(bookings).where(eq(bookings.customerId, customerId)).orderBy(desc(bookings.createdAt));
  }

  async updateBookingStatus(id: string, status: string): Promise<Booking> {
    const [updatedBooking] = await db
      .update(bookings)
      .set({ status, updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();
    return updatedBooking;
  }

  // Demand request operations
  async createDemandRequest(request: InsertDemandRequest): Promise<DemandRequest> {
    const [newRequest] = await db.insert(demandRequests).values(request).returning();
    return newRequest;
  }

  async getDemandRequests(): Promise<DemandRequest[]> {
    return await db.select().from(demandRequests).orderBy(desc(demandRequests.createdAt));
  }

  async getOpenDemandRequests(): Promise<DemandRequest[]> {
    return await db.select().from(demandRequests).where(eq(demandRequests.status, 'open')).orderBy(desc(demandRequests.createdAt));
  }

  async updateDemandRequestStatus(id: string, status: string, matchedBookingId?: string): Promise<DemandRequest> {
    const updateData: any = { status, updatedAt: new Date() };
    if (matchedBookingId) {
      updateData.matchedBookingId = matchedBookingId;
    }
    
    const [updatedRequest] = await db
      .update(demandRequests)
      .set(updateData)
      .where(eq(demandRequests.id, id))
      .returning();
    return updatedRequest;
  }

  // Smart matching algorithm
  async runSmartMatching(): Promise<{ matches: number; newBookings: number }> {
    const openDemands = await this.getOpenDemandRequests();
    const availableProduction = await this.getAvailableEggProduction();
    
    let matches = 0;
    let newBookings = 0;

    for (const demand of openDemands) {
      // Check if we can fulfill this demand based on production capacity
      if (availableProduction.availableCrates >= demand.cratesNeeded) {
        // Create automatic booking for this demand
        const customer = await this.getCustomerById(demand.customerId);
        if (customer) {
          const deliveryDate = demand.preferredDeliveryDate || 
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 7 days from now
          
          const pricePerCrate = demand.maxPricePerCrate || 450; // Default price
          const totalAmount = demand.cratesNeeded * pricePerCrate;
          
          const booking = await this.createBooking({
            customerId: demand.customerId,
            userId: 'system', // System-generated booking
            bookingDate: new Date().toISOString().split('T')[0],
            deliveryDate,
            cratesRequested: demand.cratesNeeded,
            pricePerCrate,
            totalAmount,
            deposit: 0,
            status: 'pending',
            priority: demand.urgencyLevel === 'urgent' ? 'high' : 'normal',
            specialRequirements: null,
            notes: `Auto-generated from demand request: ${demand.description || ''}`
          });

          // Update demand request as matched
          await this.updateDemandRequestStatus(demand.id, 'matched', booking.id);
          
          matches++;
          newBookings++;
        }
      }
    }

    return { matches, newBookings };
  }

  // Get available egg production capacity
  async getAvailableEggProduction(): Promise<{ availableCrates: number; projectedDailyProduction: number }> {
    // Get current inventory and daily production
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = await db
      .select()
      .from(dailyRecords)
      .where(eq(dailyRecords.recordDate, today));
    
    const todayProduction = todayRecords.reduce((sum, record) => sum + (record.cratesProduced || 0), 0);
    
    // Get pending bookings to calculate committed inventory
    const pendingBookings = await db
      .select()
      .from(bookings)
      .where(sql`${bookings.status} IN ('pending', 'confirmed')`);
    
    const committedCrates = pendingBookings.reduce((sum, booking) => sum + booking.cratesRequested, 0);
    
    // Estimate available capacity based on daily production (assuming 7 days ahead planning)
    const projectedDailyProduction = todayProduction || 150; // Default to 150 crates per day
    const projectedWeeklyProduction = projectedDailyProduction * 7;
    const availableCrates = Math.max(0, projectedWeeklyProduction - committedCrates);
    
    return {
      availableCrates,
      projectedDailyProduction
    };
  }
}

export const storage = new DatabaseStorage();
