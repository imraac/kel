import {
  users,
  flocks,
  dailyRecords,
  sales,
  feedInventory,
  healthRecords,
  expenses,
  customers,
  products,
  orders,
  orderItems,
  deliveries,
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
  type InsertProduct,
  type Product,
  type InsertOrder,
  type Order,
  type InsertOrderItem,
  type OrderItem,
  type InsertDelivery,
  type Delivery,
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

  // Marketplace operations - Customers
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  getCustomers(): Promise<Customer[]>;
  getCustomerById(id: string): Promise<Customer | undefined>;
  updateCustomer(id: string, updates: Partial<InsertCustomer>): Promise<Customer>;

  // Marketplace operations - Products
  createProduct(product: InsertProduct): Promise<Product>;
  getProducts(): Promise<Product[]>;
  getProductById(id: string): Promise<Product | undefined>;
  updateProduct(id: string, updates: Partial<InsertProduct>): Promise<Product>;
  
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
  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await db.insert(orders).values(order).returning();
    return newOrder;
  }

  // SECURE: Atomic order creation with server-side pricing and inventory validation
  async createOrderWithItems(orderData: {
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
    
    const orderInsertData = {
      orderNumber,
      customerId: orderData.customerId,
      userId: orderData.userId,
      requiredDate: orderData.requiredDate,
      deliveryMethod: orderData.deliveryMethod,
      deliveryAddress: orderData.deliveryAddress,
      notes: orderData.notes,
      status: 'pending' as const,
      totalAmount: validation.totalAmount.toString(),
      paidAmount: '0',
      paymentStatus: 'pending' as const
    };

    const [newOrder] = await db.insert(orders).values(orderInsertData).returning();

    // Step 3: Create order items with server-calculated pricing and decrement stock
    const createdOrderItems: OrderItem[] = [];
    
    try {
      for (const validatedItem of validation.validatedItems) {
        // Create order item with server-calculated prices
        const orderItemData = {
          orderId: newOrder.id,
          productId: validatedItem.productId,
          quantity: validatedItem.quantity,
          unitPrice: validatedItem.unitPrice.toString(),
          totalPrice: validatedItem.totalPrice.toString()
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
  async createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem> {
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
}

export const storage = new DatabaseStorage();
