import {
  users,
  farms,
  flocks,
  dailyRecords,
  sales,
  feedInventory,
  healthRecords,
  expenses,
  notifications,
  customers,
  products,
  orders,
  orderItems,
  deliveries,
  weightRecords,
  breedStandards,
  type User,
  type UpsertUser,
  type InsertFarm,
  type Farm,
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
  type InsertProduct,
  type Product,
  type InsertOrder,
  type Order,
  type InsertOrderItem,
  type OrderItem,
  type InsertDelivery,
  type Delivery,
  type InsertNotification,
  type Notification,
  type InsertWeightRecord,
  type WeightRecord,
  type InsertBreedStandard,
  type BreedStandard,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, gte, lte, sql, ne, isNotNull } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // Farm operations
  createFarm(farm: InsertFarm): Promise<Farm>;
  createFarmWithOwner(farm: InsertFarm, userId: string): Promise<{ farm: Farm; user: User }>;
  getFarms(): Promise<Farm[]>;
  getFarmsByUserAccess(userId: string, userRole: string): Promise<Farm[]>;
  getFarmById(id: string): Promise<Farm | undefined>;
  updateFarm(id: string, updates: Partial<InsertFarm>): Promise<Farm>;
  updateFarmOwnerFields(id: string, updates: Partial<InsertFarm>): Promise<Farm>;
  getFarmsByUserId(userId: string): Promise<Farm[]>;
  
  // Public API methods (no authentication required)
  getPublicFarms(): Promise<Farm[]>;
  getPublicFarmById(id: string): Promise<Farm | undefined>;

  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  getUsersByFarm(farmId: string): Promise<User[]>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Flock operations
  createFlock(flock: InsertFlock): Promise<Flock>;
  getFlocks(includeDeactivated?: boolean): Promise<Flock[]>;
  getFlockById(id: string): Promise<Flock | undefined>;
  updateFlock(id: string, updates: Partial<InsertFlock>): Promise<Flock>;

  // Daily record operations
  createDailyRecord(record: InsertDailyRecord): Promise<DailyRecord>;
  createDailyRecordWithReview(record: InsertDailyRecord & { reviewStatus: string; isDuplicate: boolean; duplicateOfId?: string }): Promise<DailyRecord>;
  createDailyRecordWithNotification(record: InsertDailyRecord & { reviewStatus: string; isDuplicate: boolean; duplicateOfId?: string }, farmId: string, notificationData: { type: string; title: string; message: string; meta?: any }): Promise<DailyRecord>;
  findDailyRecordDuplicate(userId: string, flockId: string, recordDate: string): Promise<DailyRecord | null>;
  getDailyRecords(flockId?: string, limit?: number): Promise<DailyRecord[]>;
  getDailyRecordsByDateRange(startDate: string, endDate: string): Promise<DailyRecord[]>;
  updateDailyRecord(id: string, updates: Partial<InsertDailyRecord>): Promise<DailyRecord>;

  // Sales operations
  createSale(sale: InsertSale): Promise<Sale>;
  getSales(limit?: number): Promise<Sale[]>;
  getSalesByDateRange(startDate: string, endDate: string): Promise<Sale[]>;

  // Feed inventory operations
  createFeedInventory(feed: InsertFeedInventory): Promise<FeedInventory>;
  getFeedInventory(farmId: string): Promise<FeedInventory[]>;
  updateFeedInventory(id: string, updates: Partial<InsertFeedInventory>): Promise<FeedInventory>;
  deleteFeedInventory(id: string): Promise<void>;

  // Health record operations
  createHealthRecord(record: InsertHealthRecord): Promise<HealthRecord>;
  getHealthRecords(flockId?: string, limit?: number): Promise<HealthRecord[]>;

  // Expense operations
  createExpense(expense: InsertExpense): Promise<Expense>;
  getExpenses(limit?: number): Promise<Expense[]>;
  getExpensesByDateRange(startDate: string, endDate: string): Promise<Expense[]>;

  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  createNotificationForManagers(farmId: string, notificationData: { type: string; title: string; message: string; meta?: any }): Promise<void>;
  getNotificationsByUser(userId: string, limit?: number): Promise<Notification[]>;
  markNotificationAsRead(notificationId: string): Promise<void>;

  // Dashboard analytics
  getDashboardMetrics(): Promise<any>;
  getRecentActivity(limit?: number): Promise<any[]>;

  // Marketplace operations - Customers
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  getCustomers(): Promise<Customer[]>;
  getCustomerById(id: string): Promise<Customer | undefined>;
  getCustomerByUserId(userId: string): Promise<Customer | undefined>;
  updateCustomer(id: string, updates: Partial<InsertCustomer>): Promise<Customer>;
  linkCustomerByEmail(email: string, userId: string): Promise<void>;
  upsertCustomerForUser(userId: string, customerData: Omit<InsertCustomer, 'userId'>): Promise<Customer>;

  // Marketplace operations - Products
  createProduct(product: InsertProduct): Promise<Product>;
  getProducts(): Promise<Product[]>;
  getProductById(id: string): Promise<Product | undefined>;
  updateProduct(id: string, updates: Partial<InsertProduct>): Promise<Product>;
  
  // Public product methods (no authentication required)
  getPublicProducts(): Promise<Product[]>;
  getPublicProductsByFarm(farmId: string): Promise<Product[]>;
  
  // Inventory validation and management
  checkProductStock(productId: string, requiredQuantity: number): Promise<{ available: boolean; currentStock: number; productPrice: number; productName: string }>;
  decrementProductStock(productId: string, quantity: number): Promise<Product>;
  validateOrderItems(items: Array<{ productId: string; quantity: number }>): Promise<{ valid: boolean; errors: string[]; totalAmount: number; validatedItems: Array<{ productId: string; quantity: number; unitPrice: number; totalPrice: number; productName: string }> }>;

  // Marketplace operations - Orders
  createOrder(order: InsertOrder): Promise<Order>;
  getOrders(limit?: number): Promise<Order[]>;
  getOrderById(id: string): Promise<Order | undefined>;
  updateOrder(id: string, updates: Partial<InsertOrder>): Promise<Order>;
  getOrdersByCustomer(customerId: string): Promise<Order[]>;

  // SECURE: Atomic order creation with server-side pricing and inventory validation
  createOrderWithItems(orderData: {
    farmId: string;
    customerId: string;
    userId: string;
    requiredDate?: string;
    deliveryMethod: string;
    deliveryAddress?: string;
    notes?: string;
    items: Array<{ productId: string; quantity: number }>;
  }): Promise<{
    order: Order;
    orderItems: OrderItem[];
    totalAmount: number;
  }>;

  // Marketplace operations - Order Items
  createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem>;
  getOrderItems(orderId: string): Promise<OrderItem[]>;

  // Marketplace operations - Deliveries
  createDelivery(delivery: InsertDelivery): Promise<Delivery>;
  getDeliveries(): Promise<Delivery[]>;
  getDeliveryByOrderId(orderId: string): Promise<Delivery | undefined>;
  updateDelivery(id: string, updates: Partial<InsertDelivery>): Promise<Delivery>;
}

export class DatabaseStorage implements IStorage {
  // Farm operations
  async createFarm(farm: InsertFarm): Promise<Farm> {
    const [newFarm] = await db.insert(farms).values(farm).returning();
    return newFarm;
  }

  // SECURE: Atomic farm creation with user binding - prevents tenant orphaning
  async createFarmWithOwner(farm: InsertFarm, userId: string): Promise<{ farm: Farm; user: User }> {
    return await db.transaction(async (tx) => {
      // Step 1: Create the farm
      const [newFarm] = await tx.insert(farms).values(farm).returning();

      // Step 2: Get current user to check if they're admin
      const [currentUser] = await tx.select().from(users).where(eq(users.id, userId));
      if (!currentUser) {
        throw new Error('User not found');
      }

      // Step 3: Admin users remain global admins, others become farm owners
      if (currentUser.role === 'admin') {
        // Admin users create farms but remain global (no farmId binding)
        // This satisfies the check constraint: admin role must have farmId = null
        const [updatedUser] = await tx
          .update(users)
          .set({
            updatedAt: new Date()
          })
          .where(eq(users.id, userId))
          .returning();
        
        return { farm: newFarm, user: updatedUser };
      } else {
        // Regular users become farm owners and get bound to the farm
        const [updatedUser] = await tx
          .update(users)
          .set({
            farmId: newFarm.id,
            role: 'farm_owner',
            updatedAt: new Date()
          })
          .where(eq(users.id, userId))
          .returning();

        if (!updatedUser) {
          throw new Error('Failed to bind user to farm - user not found');
        }

        return { farm: newFarm, user: updatedUser };
      }
    });
  }

  async getFarms(): Promise<Farm[]> {
    return await db.select().from(farms).orderBy(desc(farms.createdAt));
  }

  // SECURE: Get farms based on user access permissions
  async getFarmsByUserAccess(userId: string, userRole: string): Promise<Farm[]> {
    if (userRole === 'admin') {
      // Admins can see all farms
      return await db.select().from(farms).orderBy(desc(farms.createdAt));
    } else {
      // Non-admins can only see their own farm
      const user = await this.getUser(userId);
      if (!user?.farmId) {
        return [];
      }
      return await db
        .select()
        .from(farms)
        .where(eq(farms.id, user.farmId))
        .orderBy(desc(farms.createdAt));
    }
  }

  async getFarmById(id: string): Promise<Farm | undefined> {
    const [farm] = await db.select().from(farms).where(eq(farms.id, id));
    return farm;
  }

  async updateFarm(id: string, updates: Partial<InsertFarm>): Promise<Farm> {
    const [updatedFarm] = await db
      .update(farms)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(farms.id, id))
      .returning();
    return updatedFarm;
  }

  // SECURE: Update farm with only owner-editable fields to prevent privilege escalation
  async updateFarmOwnerFields(id: string, updates: Partial<InsertFarm>): Promise<Farm> {
    // Only allow farm owners to update specific fields, excluding admin-only fields
    const ownerUpdatableFields = {
      name: updates.name,
      description: updates.description,
      location: updates.location,
      address: updates.address,
      contactEmail: updates.contactEmail,
      contactPhone: updates.contactPhone,
      website: updates.website,
      totalBirds: updates.totalBirds,
      avgEggsPerDay: updates.avgEggsPerDay,
      specialization: updates.specialization,
      businessRegistration: updates.businessRegistration,
      certifications: updates.certifications
    };

    // Remove undefined fields
    const cleanUpdates = Object.fromEntries(
      Object.entries(ownerUpdatableFields).filter(([_, value]) => value !== undefined)
    );

    const [updatedFarm] = await db
      .update(farms)
      .set({ ...cleanUpdates, updatedAt: new Date() })
      .where(eq(farms.id, id))
      .returning();
    return updatedFarm;
  }

  async getFarmsByUserId(userId: string): Promise<Farm[]> {
    return await db
      .select()
      .from(farms)
      .innerJoin(users, eq(users.farmId, farms.id))
      .where(eq(users.id, userId))
      .then(results => results.map(r => r.farms));
  }

  // Public API methods (no authentication required)
  async getPublicFarms(): Promise<Farm[]> {
    // Only return approved and active farms for public browsing
    return await db
      .select()
      .from(farms)
      .where(and(eq(farms.status, 'active'), eq(farms.isApproved, true)))
      .orderBy(desc(farms.createdAt));
  }

  async getPublicFarmById(id: string): Promise<Farm | undefined> {
    // Only return if farm is approved and active
    const [farm] = await db
      .select()
      .from(farms)
      .where(and(eq(farms.id, id), eq(farms.status, 'active'), eq(farms.isApproved, true)));
    return farm;
  }

  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUsersByFarm(farmId: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(and(eq(users.farmId, farmId), ne(users.role, 'admin')))
      .orderBy(desc(users.createdAt));
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.email,
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

  async getFlocks(includeDeactivated: boolean = false): Promise<Flock[]> {
    if (includeDeactivated) {
      return await db.select().from(flocks).orderBy(desc(flocks.createdAt));
    } else {
      return await db.select()
        .from(flocks)
        .where(ne(flocks.status, 'deactivated'))
        .orderBy(desc(flocks.createdAt));
    }
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

  async createDailyRecordWithReview(record: InsertDailyRecord & { reviewStatus: string; isDuplicate: boolean; duplicateOfId?: string }): Promise<DailyRecord> {
    const [newRecord] = await db.insert(dailyRecords).values(record).returning();
    return newRecord;
  }

  async createDailyRecordWithNotification(
    record: InsertDailyRecord & { reviewStatus: string; isDuplicate: boolean; duplicateOfId?: string }, 
    farmId: string, 
    notificationData: { type: string; title: string; message: string; meta?: any }
  ): Promise<DailyRecord> {
    return await db.transaction(async (tx) => {
      // Create the daily record
      const [newRecord] = await tx.insert(dailyRecords).values(record).returning();

      // Find all managers and farm_owners in this farm
      const managers = await tx
        .select()
        .from(users)
        .where(
          and(
            eq(users.farmId, farmId),
            sql`${users.role} IN ('manager', 'farm_owner')`
          )
        );

      // Create notifications for each manager
      const notificationsToCreate = managers.map(manager => ({
        recipientUserId: manager.id,
        farmId,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        meta: {
          ...notificationData.meta,
          recordId: newRecord.id // Add the record ID to meta
        },
        isRead: false
      }));

      if (notificationsToCreate.length > 0) {
        await tx.insert(notifications).values(notificationsToCreate);
      }

      return newRecord;
    });
  }

  async findDailyRecordDuplicate(userId: string, flockId: string, recordDate: string): Promise<DailyRecord | null> {
    const [duplicate] = await db
      .select()
      .from(dailyRecords)
      .where(
        and(
          eq(dailyRecords.userId, userId),
          eq(dailyRecords.flockId, flockId),
          eq(dailyRecords.recordDate, recordDate)
        )
      )
      .orderBy(desc(dailyRecords.createdAt))
      .limit(1);
    return duplicate || null;
  }

  async getDailyRecords(flockId?: string, limit = 50): Promise<DailyRecord[]> {
    if (flockId) {
      return await db
        .select()
        .from(dailyRecords)
        .where(eq(dailyRecords.flockId, flockId))
        .orderBy(desc(dailyRecords.recordDate))
        .limit(limit);
    }
    
    return await db
      .select()
      .from(dailyRecords)
      .orderBy(desc(dailyRecords.recordDate))
      .limit(limit);
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

  async getSalesByFarm(farmId: string, limit = 50): Promise<Sale[]> {
    return await db
      .select()
      .from(sales)
      .where(eq(sales.farmId, farmId))
      .orderBy(desc(sales.saleDate))
      .limit(limit);
  }

  // Feed inventory operations
  async createFeedInventory(feed: InsertFeedInventory): Promise<FeedInventory> {
    const [newFeed] = await db.insert(feedInventory).values(feed).returning();
    return newFeed;
  }

  async getFeedInventory(farmId: string): Promise<FeedInventory[]> {
    return await db
      .select()
      .from(feedInventory)
      .where(eq(feedInventory.farmId, farmId))
      .orderBy(desc(feedInventory.createdAt));
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
    if (flockId) {
      return await db
        .select()
        .from(healthRecords)
        .where(eq(healthRecords.flockId, flockId))
        .orderBy(desc(healthRecords.recordDate))
        .limit(limit);
    }
    
    return await db
      .select()
      .from(healthRecords)
      .orderBy(desc(healthRecords.recordDate))
      .limit(limit);
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

  // Notification operations
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async createNotificationForManagers(farmId: string, notificationData: { type: string; title: string; message: string; meta?: any }): Promise<void> {
    // Find all managers and farm_owners in this farm
    const managers = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.farmId, farmId),
          sql`${users.role} IN ('manager', 'farm_owner')`
        )
      );

    // Create notification for each manager
    const notificationsToCreate = managers.map(manager => ({
      recipientUserId: manager.id,
      farmId,
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      meta: notificationData.meta,
      isRead: false
    }));

    if (notificationsToCreate.length > 0) {
      await db.insert(notifications).values(notificationsToCreate);
    }
  }

  async getNotificationsByUser(userId: string, limit = 20): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.recipientUserId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true, updatedAt: new Date() })
      .where(eq(notifications.id, notificationId));
  }

  // Dashboard analytics
  async getDashboardMetrics(): Promise<any> {
    // Get total birds from all active flocks (excluding deactivated)
    const activeFlocks = await db.select().from(flocks).where(ne(flocks.status, 'deactivated'));
    const totalBirds = activeFlocks.reduce((sum, flock) => sum + flock.currentCount, 0);

    // Get today's egg production (check today and yesterday to handle timezone issues)
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Get records from the past 2 days to handle timezone differences
    const recentRecords = await db
      .select()
      .from(dailyRecords)
      .where(
        or(
          eq(dailyRecords.recordDate, yesterday),
          eq(dailyRecords.recordDate, today),
          eq(dailyRecords.recordDate, tomorrow)
        )
      );
    
    // Get the most recent date that has egg collection data
    const recordsByDate = recentRecords.reduce((acc, record) => {
      if (!acc[record.recordDate]) acc[record.recordDate] = [];
      acc[record.recordDate].push(record);
      return acc;
    }, {} as Record<string, any[]>);
    
    // Find the most recent date with egg collection data
    const sortedDates = Object.keys(recordsByDate).sort().reverse();
    let todayEggs = 0;
    let todayCrates = 0;
    
    for (const date of sortedDates) {
      const dateRecords = recordsByDate[date];
      const dateEggs = dateRecords.reduce((sum, record) => sum + (record.eggsCollected || 0), 0);
      if (dateEggs > 0) {
        todayEggs = dateEggs;
        todayCrates = dateRecords.reduce((sum, record) => sum + (record.cratesProduced || 0), 0);
        break;
      }
    }
    
    // If no eggs found in recent days, just use today's records (might be 0)
    if (todayEggs === 0 && recordsByDate[today]) {
      const todayRecords = recordsByDate[today];
      todayEggs = todayRecords.reduce((sum, record) => sum + (record.eggsCollected || 0), 0);
      todayCrates = todayRecords.reduce((sum, record) => sum + (record.cratesProduced || 0), 0);
    }

    // Get feed inventory total
    const feedInventoryData = await db.select().from(feedInventory);
    const totalFeedStock = feedInventoryData.reduce((sum, feed) => sum + parseFloat(feed.quantityKg || '0'), 0);

    // Calculate feed days remaining based on recent consumption
    // Get last 14 days of daily records to calculate average consumption
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const recentFeedRecords = await db
      .select()
      .from(dailyRecords)
      .where(
        and(
          gte(dailyRecords.recordDate, fourteenDaysAgo),
          isNotNull(dailyRecords.feedConsumed)
        )
      );

    // Calculate average daily feed consumption (industry standard: 0.11kg per bird)
    let averageDailyConsumption = 0;
    if (recentFeedRecords.length > 0) {
      const totalConsumed = recentFeedRecords.reduce((sum, record) => 
        sum + parseFloat(record.feedConsumed || '0'), 0
      );
      averageDailyConsumption = totalConsumed / recentFeedRecords.length;
    } else if (totalBirds > 0) {
      // Fallback to industry standard if no recent records
      averageDailyConsumption = totalBirds * 0.11; // 0.11kg per bird per day
    }

    // Calculate days remaining (defensive against division by zero)
    const feedDaysRemaining = averageDailyConsumption > 0 
      ? Math.floor(totalFeedStock / averageDailyConsumption)
      : 0;

    // Get current month revenue
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];
    const monthlySales = await this.getSalesByDateRange(monthStart, monthEnd);
    const monthlyRevenue = monthlySales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount || '0'), 0);

    // Get last month revenue for comparison
    const lastMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split('T')[0];
    const lastMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().split('T')[0];
    const lastMonthSales = await this.getSalesByDateRange(lastMonthStart, lastMonthEnd);
    const lastMonthRevenue = lastMonthSales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount || '0'), 0);

    // Calculate percentage change
    const revenueChange = lastMonthRevenue > 0 
      ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)
      : monthlyRevenue > 0 ? '+100' : '0';

    return {
      totalBirds,
      todayEggs,
      todayCrates,
      totalFeedStock,
      feedDaysRemaining,
      averageDailyConsumption: Number(averageDailyConsumption.toFixed(2)),
      monthlyRevenue,
      revenueChange,
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

  // Marketplace operations - Customers
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

  async getCustomerByUserId(userId: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.userId, userId));
    return customer;
  }

  async linkCustomerByEmail(email: string, userId: string): Promise<void> {
    // Only link if this user doesn't already have a customer record
    const existingCustomer = await this.getCustomerByUserId(userId);
    if (existingCustomer) {
      return; // User already has a customer record, skip linking
    }
    
    // Find customer with matching email that doesn't have a userId yet
    await db
      .update(customers)
      .set({ userId, updatedAt: new Date() })
      .where(and(eq(customers.email, email), sql`user_id IS NULL`));
  }

  async upsertCustomerForUser(userId: string, customerData: Omit<InsertCustomer, 'userId'>): Promise<Customer> {
    // First try to update if customer exists for this user
    const existingCustomer = await this.getCustomerByUserId(userId);
    
    if (existingCustomer) {
      return await this.updateCustomer(existingCustomer.id, customerData);
    }
    
    // Create new customer with userId
    const [newCustomer] = await db
      .insert(customers)
      .values({ ...customerData, userId })
      .returning();
    return newCustomer;
  }

  // Marketplace operations - Products
  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async getProducts(): Promise<Product[]> {
    return await db.select().from(products).orderBy(desc(products.createdAt));
  }

  async getProductById(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async updateProduct(id: string, updates: Partial<InsertProduct>): Promise<Product> {
    const [updatedProduct] = await db
      .update(products)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return updatedProduct;
  }

  // Public product methods (no authentication required)
  async getPublicProducts(): Promise<Product[]> {
    // Only return available products from approved and active farms
    return await db
      .select({
        id: products.id,
        farmId: products.farmId,
        name: products.name,
        category: products.category,
        description: products.description,
        unit: products.unit,
        currentPrice: products.currentPrice,
        minOrderQuantity: products.minOrderQuantity,
        stockQuantity: products.stockQuantity,
        isAvailable: products.isAvailable,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .innerJoin(farms, eq(products.farmId, farms.id))
      .where(and(
        eq(products.isAvailable, true),
        eq(farms.status, 'active'),
        eq(farms.isApproved, true)
      ))
      .orderBy(desc(products.createdAt));
  }

  async getPublicProductsByFarm(farmId: string): Promise<Product[]> {
    // Only return available products if farm is approved and active
    return await db
      .select({
        id: products.id,
        farmId: products.farmId,
        name: products.name,
        category: products.category,
        description: products.description,
        unit: products.unit,
        currentPrice: products.currentPrice,
        minOrderQuantity: products.minOrderQuantity,
        stockQuantity: products.stockQuantity,
        isAvailable: products.isAvailable,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .innerJoin(farms, eq(products.farmId, farms.id))
      .where(and(
        eq(products.farmId, farmId),
        eq(products.isAvailable, true),
        eq(farms.status, 'active'),
        eq(farms.isApproved, true)
      ))
      .orderBy(desc(products.createdAt));
  }

  // Inventory validation and management
  async checkProductStock(productId: string, requiredQuantity: number): Promise<{ available: boolean; currentStock: number; productPrice: number; productName: string }> {
    const [product] = await db.select().from(products).where(eq(products.id, productId));
    
    if (!product) {
      throw new Error(`Product with id ${productId} not found`);
    }
    
    if (!product.isAvailable) {
      return {
        available: false,
        currentStock: product.stockQuantity || 0,
        productPrice: parseFloat(product.currentPrice),
        productName: product.name
      };
    }
    
    const currentStock = product.stockQuantity || 0;
    const available = currentStock >= requiredQuantity;
    
    return {
      available,
      currentStock,
      productPrice: parseFloat(product.currentPrice),
      productName: product.name
    };
  }

  async decrementProductStock(productId: string, quantity: number): Promise<Product> {
    // First check if we have enough stock
    const stockCheck = await this.checkProductStock(productId, quantity);
    
    if (!stockCheck.available) {
      throw new Error(`Insufficient stock for product ${stockCheck.productName}. Required: ${quantity}, Available: ${stockCheck.currentStock}`);
    }
    
    // Atomically decrement stock
    const [updatedProduct] = await db
      .update(products)
      .set({ 
        stockQuantity: sql`${products.stockQuantity} - ${quantity}`,
        updatedAt: new Date()
      })
      .where(and(
        eq(products.id, productId),
        sql`${products.stockQuantity} >= ${quantity}` // Double-check in the same transaction
      ))
      .returning();
      
    if (!updatedProduct) {
      throw new Error(`Failed to decrement stock - insufficient quantity available`);
    }
    
    return updatedProduct;
  }

  async validateOrderItems(items: Array<{ productId: string; quantity: number }>): Promise<{ 
    valid: boolean; 
    errors: string[]; 
    totalAmount: number; 
    validatedItems: Array<{ productId: string; quantity: number; unitPrice: number; totalPrice: number; productName: string }> 
  }> {
    const errors: string[] = [];
    const validatedItems: Array<{ productId: string; quantity: number; unitPrice: number; totalPrice: number; productName: string }> = [];
    let totalAmount = 0;

    // Validate each item
    for (const item of items) {
      try {
        if (item.quantity <= 0) {
          errors.push(`Invalid quantity ${item.quantity} for product ${item.productId}`);
          continue;
        }

        const stockCheck = await this.checkProductStock(item.productId, item.quantity);
        
        if (!stockCheck.available) {
          errors.push(`Insufficient stock for ${stockCheck.productName}. Required: ${item.quantity}, Available: ${stockCheck.currentStock}`);
          continue;
        }

        const itemTotal = stockCheck.productPrice * item.quantity;
        totalAmount += itemTotal;

        validatedItems.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: stockCheck.productPrice,
          totalPrice: itemTotal,
          productName: stockCheck.productName
        });

      } catch (error) {
        errors.push(`Error validating product ${item.productId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      valid: errors.length === 0 && validatedItems.length > 0,
      errors,
      totalAmount,
      validatedItems
    };
  }

  // Marketplace operations - Orders
  async createOrder(order: typeof orders.$inferInsert): Promise<Order> {
    const [newOrder] = await db.insert(orders).values(order).returning();
    return newOrder;
  }

  // SECURE: Atomic order creation with server-side pricing and inventory validation
  async createOrderWithItems(orderData: {
    farmId: string;
    customerId: string;
    userId: string;
    requiredDate?: string;
    deliveryMethod: string;
    deliveryAddress?: string;
    notes?: string;
    items: Array<{ productId: string; quantity: number }>;
  }): Promise<{
    order: Order;
    orderItems: OrderItem[];
    totalAmount: number;
  }> {
    // Step 1: Validate all items and calculate pricing server-side
    const validation = await this.validateOrderItems(orderData.items);
    
    if (!validation.valid) {
      throw new Error(`Order validation failed: ${validation.errors.join(', ')}`);
    }

    if (validation.validatedItems.length === 0) {
      throw new Error('No valid items in order');
    }

    // Step 2: Create order with server-calculated total amount
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    const totalAmountStr = validation.totalAmount.toFixed(2);
    
    console.log('Debug - orderData.farmId:', orderData.farmId);
    console.log('Debug - full orderData:', orderData);
    
    const orderInsertData = {
      orderNumber,
      farmId: orderData.farmId,
      customerId: orderData.customerId,
      userId: orderData.userId,
      requiredDate: orderData.requiredDate,
      deliveryMethod: orderData.deliveryMethod,
      deliveryAddress: orderData.deliveryAddress,
      notes: orderData.notes,
      status: 'pending' as const,
      totalAmount: totalAmountStr,
      paidAmount: '0.00',
      paymentStatus: 'pending' as const
    };
    
    console.log('Debug - orderInsertData:', orderInsertData);

    const [newOrder] = await db.insert(orders).values(orderInsertData).returning();

    // Step 3: Create order items with server-calculated pricing and decrement stock
    const createdOrderItems: OrderItem[] = [];
    
    try {
      for (const validatedItem of validation.validatedItems) {
        // Create order item with server-calculated prices
        const unitPriceStr = validatedItem.unitPrice.toFixed(2);
        const totalPriceStr = validatedItem.totalPrice.toFixed(2);
        const orderItemData = {
          orderId: newOrder.id,
          productId: validatedItem.productId,
          quantity: validatedItem.quantity,
          unitPrice: unitPriceStr,
          totalPrice: totalPriceStr
        };

        const [orderItem] = await db.insert(orderItems).values(orderItemData).returning();
        createdOrderItems.push(orderItem);

        // Atomically decrement stock
        await this.decrementProductStock(validatedItem.productId, validatedItem.quantity);
      }

      return {
        order: newOrder,
        orderItems: createdOrderItems,
        totalAmount: validation.totalAmount
      };

    } catch (error) {
      // If anything fails after order creation, we should ideally rollback the order
      // For now, we'll let the error propagate and handle cleanup at a higher level
      throw new Error(`Failed to complete order creation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getOrders(limit = 50): Promise<Order[]> {
    return await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(limit);
  }

  async getOrderById(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async updateOrder(id: string, updates: Partial<InsertOrder>): Promise<Order> {
    const [updatedOrder] = await db
      .update(orders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return updatedOrder;
  }

  async getOrdersByCustomer(customerId: string): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.customerId, customerId))
      .orderBy(desc(orders.createdAt));
  }

  // Marketplace operations - Order Items
  async createOrderItem(orderItem: typeof orderItems.$inferInsert): Promise<OrderItem> {
    const [newOrderItem] = await db.insert(orderItems).values(orderItem).returning();
    return newOrderItem;
  }

  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    return await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));
  }

  // Marketplace operations - Deliveries
  async createDelivery(delivery: InsertDelivery): Promise<Delivery> {
    const [newDelivery] = await db.insert(deliveries).values(delivery).returning();
    return newDelivery;
  }

  async getDeliveries(): Promise<Delivery[]> {
    return await db.select().from(deliveries).orderBy(desc(deliveries.createdAt));
  }

  async getDeliveryByOrderId(orderId: string): Promise<Delivery | undefined> {
    const [delivery] = await db.select().from(deliveries).where(eq(deliveries.orderId, orderId));
    return delivery;
  }

  async updateDelivery(id: string, updates: Partial<InsertDelivery>): Promise<Delivery> {
    const [updatedDelivery] = await db
      .update(deliveries)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(deliveries.id, id))
      .returning();
    return updatedDelivery;
  }

  // Weight Records operations
  async createWeightRecord(weightRecord: InsertWeightRecord): Promise<WeightRecord> {
    const [newRecord] = await db.insert(weightRecords).values(weightRecord).returning();
    return newRecord;
  }

  async getWeightRecords(limit = 50): Promise<WeightRecord[]> {
    return await db
      .select()
      .from(weightRecords)
      .orderBy(desc(weightRecords.recordDate))
      .limit(limit);
  }

  async getWeightRecordsByFlock(flockId: string): Promise<WeightRecord[]> {
    return await db
      .select()
      .from(weightRecords)
      .where(eq(weightRecords.flockId, flockId))
      .orderBy(desc(weightRecords.weekNumber));
  }

  async getWeightRecordsByFlockAndWeek(flockId: string, weekNumber: number): Promise<WeightRecord | undefined> {
    const [record] = await db
      .select()
      .from(weightRecords)
      .where(and(eq(weightRecords.flockId, flockId), eq(weightRecords.weekNumber, weekNumber)));
    return record;
  }

  async updateWeightRecord(id: string, updates: Partial<InsertWeightRecord>): Promise<WeightRecord> {
    const [updatedRecord] = await db
      .update(weightRecords)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(weightRecords.id, id))
      .returning();
    return updatedRecord;
  }

  async deleteWeightRecord(id: string): Promise<void> {
    await db.delete(weightRecords).where(eq(weightRecords.id, id));
  }

  // Helper method to calculate statistics from weights array
  calculateWeightStatistics(weights: number[]): {
    average: number;
    stdDev: number;
    uniformity: number;
  } {
    if (weights.length === 0) {
      return { average: 0, stdDev: 0, uniformity: 0 };
    }

    // Calculate average
    const average = weights.reduce((sum, weight) => sum + weight, 0) / weights.length;

    // Calculate standard deviation
    const variance = weights.reduce((sum, weight) => sum + Math.pow(weight - average, 2), 0) / weights.length;
    const stdDev = Math.sqrt(variance);

    // Calculate uniformity (percentage of birds within 10% of average weight)
    const tolerance = average * 0.1; // 10% tolerance
    const uniformCount = weights.filter(weight => 
      Math.abs(weight - average) <= tolerance
    ).length;
    const uniformity = (uniformCount / weights.length) * 100;

    return {
      average: Number(average.toFixed(2)),
      stdDev: Number(stdDev.toFixed(2)),
      uniformity: Number(uniformity.toFixed(2))
    };
  }

  // Helper method to calculate current week number from hatch date
  calculateWeekNumber(hatchDate: string): number {
    const hatch = new Date(hatchDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - hatch.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.ceil(diffDays / 7);
  }

  // Breed Standards operations
  async createBreedStandard(breedStandard: InsertBreedStandard): Promise<BreedStandard> {
    const [newStandard] = await db.insert(breedStandards).values(breedStandard).returning();
    return newStandard;
  }

  async getBreedStandards(): Promise<BreedStandard[]> {
    return await db
      .select()
      .from(breedStandards)
      .orderBy(breedStandards.breedName, breedStandards.weekNumber);
  }

  async getBreedStandardsByBreed(breedName: string): Promise<BreedStandard[]> {
    return await db
      .select()
      .from(breedStandards)
      .where(eq(breedStandards.breedName, breedName))
      .orderBy(breedStandards.weekNumber);
  }

  async getBreedStandardByBreedAndWeek(breedName: string, weekNumber: number): Promise<BreedStandard | undefined> {
    const [standard] = await db
      .select()
      .from(breedStandards)
      .where(and(eq(breedStandards.breedName, breedName), eq(breedStandards.weekNumber, weekNumber)));
    return standard;
  }

  async updateBreedStandard(id: string, updates: Partial<InsertBreedStandard>): Promise<BreedStandard> {
    const [updatedStandard] = await db
      .update(breedStandards)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(breedStandards.id, id))
      .returning();
    return updatedStandard;
  }

  async deleteBreedStandard(id: string): Promise<void> {
    await db.delete(breedStandards).where(eq(breedStandards.id, id));
  }

  // Helper method to compare weight against breed standard
  async compareWithBreedStandard(
    breedName: string,
    weekNumber: number,
    averageWeight: number
  ): Promise<{
    comparisonResult: 'below_standard' | 'within_standard' | 'above_standard';
    expectedWeight: number | null;
    weightDeviation: number | null;
  }> {
    const standard = await this.getBreedStandardByBreedAndWeek(breedName, weekNumber);
    
    if (!standard) {
      return {
        comparisonResult: 'within_standard',
        expectedWeight: null,
        weightDeviation: null
      };
    }

    const expectedWeight = Number(standard.standardWeight);
    const toleranceLower = Number(standard.toleranceLower);
    const toleranceUpper = Number(standard.toleranceUpper);
    const weightDeviation = averageWeight - expectedWeight;

    let comparisonResult: 'below_standard' | 'within_standard' | 'above_standard';

    if (averageWeight < (expectedWeight - toleranceLower)) {
      comparisonResult = 'below_standard';
    } else if (averageWeight > (expectedWeight + toleranceUpper)) {
      comparisonResult = 'above_standard';
    } else {
      comparisonResult = 'within_standard';
    }

    return {
      comparisonResult,
      expectedWeight,
      weightDeviation: Number(weightDeviation.toFixed(2))
    };
  }

  // Seed Hy-Line Brown breed standards (call this once to populate the database)
  async seedHyLineBrownStandards(): Promise<void> {
    const hyLineStandards = [
      { weekNumber: 1, standardWeight: 0.060, toleranceLower: 0.010, toleranceUpper: 0.010 },
      { weekNumber: 2, standardWeight: 0.120, toleranceLower: 0.020, toleranceUpper: 0.020 },
      { weekNumber: 3, standardWeight: 0.200, toleranceLower: 0.030, toleranceUpper: 0.030 },
      { weekNumber: 4, standardWeight: 0.300, toleranceLower: 0.040, toleranceUpper: 0.040 },
      { weekNumber: 5, standardWeight: 0.400, toleranceLower: 0.050, toleranceUpper: 0.050 },
      { weekNumber: 6, standardWeight: 0.500, toleranceLower: 0.060, toleranceUpper: 0.060 },
      { weekNumber: 7, standardWeight: 0.600, toleranceLower: 0.070, toleranceUpper: 0.070 },
      { weekNumber: 8, standardWeight: 0.650, toleranceLower: 0.075, toleranceUpper: 0.075 },
      { weekNumber: 9, standardWeight: 0.780, toleranceLower: 0.080, toleranceUpper: 0.080 },
      { weekNumber: 10, standardWeight: 0.870, toleranceLower: 0.090, toleranceUpper: 0.090 },
      { weekNumber: 11, standardWeight: 0.980, toleranceLower: 0.100, toleranceUpper: 0.100 },
      { weekNumber: 12, standardWeight: 1.050, toleranceLower: 0.110, toleranceUpper: 0.110 },
      { weekNumber: 13, standardWeight: 1.140, toleranceLower: 0.120, toleranceUpper: 0.120 },
      { weekNumber: 14, standardWeight: 1.230, toleranceLower: 0.130, toleranceUpper: 0.130 },
      { weekNumber: 15, standardWeight: 1.320, toleranceLower: 0.140, toleranceUpper: 0.140 },
      { weekNumber: 16, standardWeight: 1.410, toleranceLower: 0.150, toleranceUpper: 0.150 },
      { weekNumber: 17, standardWeight: 1.500, toleranceLower: 0.160, toleranceUpper: 0.160 },
      { weekNumber: 18, standardWeight: 1.600, toleranceLower: 0.170, toleranceUpper: 0.170 },
      { weekNumber: 19, standardWeight: 1.680, toleranceLower: 0.180, toleranceUpper: 0.180 },
      { weekNumber: 20, standardWeight: 1.750, toleranceLower: 0.190, toleranceUpper: 0.190 },
    ];

    for (const standard of hyLineStandards) {
      // Check if standard already exists
      const existing = await this.getBreedStandardByBreedAndWeek('Hy-Line Brown', standard.weekNumber);
      if (!existing) {
        await this.createBreedStandard({
          breedName: 'Hy-Line Brown',
          ...standard,
          notes: `Standard weight for Hy-Line Brown at week ${standard.weekNumber}`
        });
      }
    }
  }
}

export const storage = new DatabaseStorage();
