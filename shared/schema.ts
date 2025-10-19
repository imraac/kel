import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import {
  index,
  uniqueIndex,
  check,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  integer,
  decimal,
  text,
  boolean,
  date,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (mandatory for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("customer"), // admin, farm_owner, manager, staff, customer
  farmId: varchar("farm_id").references(() => farms.id, { onDelete: "restrict", onUpdate: "cascade" }), // null for customers and global admin
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_users_farm_id").on(table.farmId),
  check("chk_users_role_farm", sql`
    (role in ('customer', 'admin') and farm_id is null) or 
    (role in ('farm_owner', 'manager', 'staff') and farm_id is not null)
  `),
]);

// Farms table - multi-tenant support
export const farms = pgTable("farms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  location: varchar("location").notNull(), // city, region
  address: text("address"),
  contactEmail: varchar("contact_email"),
  contactPhone: varchar("contact_phone"),
  website: varchar("website"),
  
  // Farm capacity and specialization
  totalBirds: integer("total_birds").default(0),
  avgEggsPerDay: integer("avg_eggs_per_day").default(0),
  specialization: varchar("specialization").default("layers"), // layers, broilers, mixed
  
  // Business details
  businessRegistration: varchar("business_registration"),
  certifications: text("certifications"), // organic, free-range, etc
  
  // Platform status
  status: varchar("status").notNull().default("active"), // active, inactive, pending
  isApproved: boolean("is_approved").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Flocks table
export const flocks = pgTable("flocks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  farmId: varchar("farm_id").notNull().references(() => farms.id, { onDelete: "restrict", onUpdate: "cascade" }), // Associate with specific farm
  name: varchar("name").notNull(),
  breed: varchar("breed"),
  initialCount: integer("initial_count").notNull(),
  currentCount: integer("current_count").notNull(),
  hatchDate: date("hatch_date").notNull(),
  status: varchar("status").notNull().default("brooding"), // brooding, laying, retired, deactivated
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_flocks_farm_id").on(table.farmId),
  check("chk_flocks_counts", sql`initial_count >= 0 and current_count >= 0`),
]);

// Daily records table
export const dailyRecords = pgTable("daily_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  flockId: varchar("flock_id").notNull().references(() => flocks.id, { onDelete: "cascade" }),
  recordDate: date("record_date").notNull(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  
  // Egg production
  eggsCollected: integer("eggs_collected"),
  brokenEggs: integer("broken_eggs"),
  cratesProduced: integer("crates_produced"),
  
  // Mortality
  mortalityCount: integer("mortality_count").default(0),
  mortalityReason: text("mortality_reason"),
  
  // Feed
  feedConsumed: decimal("feed_consumed", { precision: 10, scale: 2 }),
  feedType: varchar("feed_type"),
  
  // Brooding data
  temperature: decimal("temperature", { precision: 5, scale: 2 }),
  lightingHours: decimal("lighting_hours", { precision: 4, scale: 2 }),
  
  // Weight tracking
  averageWeight: decimal("average_weight", { precision: 6, scale: 2 }),
  sampleSize: integer("sample_size"),
  
  notes: text("notes"),
  
  // Review system
  reviewStatus: varchar("review_status").notNull().default("approved"), // approved, pending_review, rejected
  isDuplicate: boolean("is_duplicate").notNull().default(false),
  duplicateOfId: varchar("duplicate_of_id"), // self-reference - will add constraint later
  reviewerId: varchar("reviewer_id").references(() => users.id, { onDelete: "set null" }),
  reviewNote: text("review_note"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_daily_records_flock_id").on(table.flockId),
  index("idx_daily_records_user_id").on(table.userId),
  uniqueIndex("uniq_daily_records_flock_date_active").on(table.flockId, table.recordDate).where(sql`is_duplicate = false`),
  check("chk_daily_records_nonneg", sql`
    eggs_collected >= 0 and 
    broken_eggs >= 0 and 
    crates_produced >= 0 and 
    mortality_count >= 0
  `),
]);

// Sales table
export const sales = pgTable("sales", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  farmId: varchar("farm_id").notNull().references(() => farms.id, { onDelete: "restrict", onUpdate: "cascade" }), // Associate with specific farm
  saleDate: date("sale_date").notNull(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  customerName: varchar("customer_name"),
  cratesSold: integer("crates_sold").notNull(),
  pricePerCrate: decimal("price_per_crate", { precision: 12, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  paymentStatus: varchar("payment_status").notNull().default("pending"), // pending, paid, overdue
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_sales_farm_id").on(table.farmId),
  index("idx_sales_user_id").on(table.userId),
  check("chk_sales_nonneg", sql`
    crates_sold >= 0 and 
    price_per_crate >= 0 and 
    total_amount >= 0
  `),
]);

// Feed inventory table
export const feedInventory = pgTable("feed_inventory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  farmId: varchar("farm_id").notNull().references(() => farms.id, { onDelete: "restrict", onUpdate: "cascade" }), // Associate with specific farm
  feedType: varchar("feed_type").notNull(),
  supplier: varchar("supplier"),
  quantityKg: decimal("quantity_kg", { precision: 10, scale: 3 }).notNull(), // finer kg fractions
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }),
  purchaseDate: date("purchase_date"),
  expiryDate: date("expiry_date"),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_feed_inventory_farm_id").on(table.farmId),
  index("idx_feed_inventory_user_id").on(table.userId),
  check("chk_feed_inventory_nonneg", sql`
    quantity_kg >= 0 and 
    (unit_price is null or unit_price >= 0)
  `),
]);

// Health records table
export const healthRecords = pgTable("health_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  flockId: varchar("flock_id").notNull().references(() => flocks.id, { onDelete: "cascade" }),
  recordDate: date("record_date").notNull(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  recordType: varchar("record_type").notNull(), // vaccination, medication, treatment, checkup
  title: varchar("title").notNull(),
  description: text("description"),
  medicationUsed: varchar("medication_used"),
  dosage: varchar("dosage"),
  administeredBy: varchar("administered_by"),
  nextDueDate: date("next_due_date"),
  cost: decimal("cost", { precision: 12, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_health_records_flock_id").on(table.flockId),
  index("idx_health_records_user_id").on(table.userId),
  check("chk_health_records_cost", sql`cost is null or cost >= 0`),
]);

// Expenses table
export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  farmId: varchar("farm_id").notNull().references(() => farms.id, { onDelete: "restrict", onUpdate: "cascade" }), // Associate with specific farm
  expenseDate: date("expense_date").notNull(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  category: varchar("category").notNull(), // feed, medication, labor, utilities, equipment, other
  description: varchar("description").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  supplier: varchar("supplier"),
  receiptNumber: varchar("receipt_number"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_expenses_farm_id").on(table.farmId),
  index("idx_expenses_user_id").on(table.userId),
  check("chk_expenses_amount", sql`amount >= 0`),
]);

// Break-Even Analysis Assumptions table
export const breakEvenAssumptions = pgTable("break_even_assumptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  farmId: varchar("farm_id").notNull().references(() => farms.id, { onDelete: "cascade", onUpdate: "cascade" }), // Associate with specific farm
  productId: varchar("product_id").references(() => products.id, { onDelete: "cascade" }), // Optional: for multi-product analysis
  
  // Pricing and cost assumptions
  price: decimal("price", { precision: 12, scale: 2 }).notNull(), // Average selling price per unit
  unitVariableCost: decimal("unit_variable_cost", { precision: 12, scale: 2 }).notNull(), // Variable cost per unit
  fixedCostsPerMonth: decimal("fixed_costs_per_month", { precision: 12, scale: 2 }).notNull(), // Monthly fixed costs
  
  // Growth and seasonality
  growthRate: decimal("growth_rate", { precision: 5, scale: 4 }).default('0'), // Monthly growth rate (e.g., 0.05 = 5%)
  seasonalityFactors: jsonb("seasonality_factors"), // Optional monthly seasonality adjustments { "1": 1.0, "2": 0.9, ... }
  
  // Metadata
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_break_even_farm_id").on(table.farmId),
  index("idx_break_even_product_id").on(table.productId),
  uniqueIndex("unique_break_even_farm_product").on(table.farmId, table.productId), // One set of assumptions per farm-product combo
  check("chk_break_even_positive", sql`
    price > 0 and 
    unit_variable_cost >= 0 and 
    fixed_costs_per_month >= 0 and
    (growth_rate is null or growth_rate >= -1)
  `),
]);

// Marketplace tables

// Customers table
export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").unique().references(() => users.id, { onDelete: "cascade" }), // Link to authenticated user
  name: varchar("name").notNull(),
  email: varchar("email"),
  phone: varchar("phone").notNull(),
  address: text("address"),
  location: varchar("location"), // area/region
  customerType: varchar("customer_type").notNull().default("retail"), // retail, wholesale, distributor
  status: varchar("status").notNull().default("active"), // active, inactive
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_customers_user_id").on(table.userId),
]);

// Products table
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  farmId: varchar("farm_id").notNull().references(() => farms.id, { onDelete: "restrict", onUpdate: "cascade" }), // Associate with specific farm
  name: varchar("name").notNull(),
  category: varchar("category").notNull(), // eggs, chickens, feed
  description: text("description"),
  unit: varchar("unit").notNull(), // crates, pieces, kg
  currentPrice: decimal("current_price", { precision: 12, scale: 2 }).notNull(),
  minOrderQuantity: integer("min_order_quantity").default(1),
  stockQuantity: integer("stock_quantity").default(0),
  isAvailable: boolean("is_available").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_products_farm_id").on(table.farmId),
  check("chk_products_nonneg", sql`
    current_price >= 0 and 
    min_order_quantity >= 0 and 
    stock_quantity >= 0
  `),
]);

// Orders table
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderNumber: varchar("order_number").notNull().unique(),
  farmId: varchar("farm_id").notNull().references(() => farms.id, { onDelete: "restrict", onUpdate: "cascade" }), // Associate with specific farm
  customerId: varchar("customer_id").notNull().references(() => customers.id, { onDelete: "restrict" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "restrict" }), // staff who processed the order
  orderDate: timestamp("order_date", { withTimezone: true }).defaultNow(),
  requiredDate: date("required_date"),
  status: varchar("status").notNull().default("pending"), // pending, confirmed, processing, ready, delivered, cancelled
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 12, scale: 2 }).default("0"),
  paymentStatus: varchar("payment_status").notNull().default("pending"), // pending, partial, paid
  deliveryMethod: varchar("delivery_method").notNull(), // pickup, delivery
  deliveryAddress: text("delivery_address"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_orders_farm_id").on(table.farmId),
  index("idx_orders_customer_id").on(table.customerId),
  index("idx_orders_user_id").on(table.userId),
  check("chk_orders_amounts", sql`
    total_amount >= 0 and 
    paid_amount >= 0 and 
    paid_amount <= total_amount
  `),
]);

// Order items table
export const orderItems = pgTable("order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_order_items_order_id").on(table.orderId),
  index("idx_order_items_product_id").on(table.productId),
  check("chk_order_items_nonneg", sql`
    quantity > 0 and 
    unit_price >= 0 and 
    total_price >= 0
  `),
]);

// Deliveries table
export const deliveries = pgTable("deliveries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  driverId: varchar("driver_id").references(() => users.id, { onDelete: "set null" }), // could be staff member
  vehicleInfo: varchar("vehicle_info"),
  scheduledDate: timestamp("scheduled_date"),
  actualDate: timestamp("actual_date"),
  status: varchar("status").notNull().default("scheduled"), // scheduled, in_transit, delivered, failed
  deliveryNotes: text("delivery_notes"),
  recipientName: varchar("recipient_name"),
  recipientPhone: varchar("recipient_phone"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_deliveries_order_id").on(table.orderId),
  index("idx_deliveries_driver_id").on(table.driverId),
]);

// Notifications table
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  recipientUserId: varchar("recipient_user_id").notNull(),
  farmId: varchar("farm_id").notNull(),
  type: varchar("type").notNull(), // duplicate_entry, system_alert, task_assignment, etc
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  meta: jsonb("meta"), // additional data like referenced record IDs
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
// Farm relations
export const farmsRelations = relations(farms, ({ many }) => ({
  users: many(users),
  flocks: many(flocks),
  sales: many(sales),
  feedInventory: many(feedInventory),
  expenses: many(expenses),
  breakEvenAssumptions: many(breakEvenAssumptions),
  products: many(products),
  orders: many(orders),
}));

export const flocksRelations = relations(flocks, ({ one, many }) => ({
  farm: one(farms, {
    fields: [flocks.farmId],
    references: [farms.id],
  }),
  dailyRecords: many(dailyRecords),
  healthRecords: many(healthRecords),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  farm: one(farms, {
    fields: [users.farmId],
    references: [farms.id],
  }),
  dailyRecords: many(dailyRecords),
  sales: many(sales),
  feedInventory: many(feedInventory),
  healthRecords: many(healthRecords),
  expenses: many(expenses),
}));

export const dailyRecordsRelations = relations(dailyRecords, ({ one }) => ({
  flock: one(flocks, {
    fields: [dailyRecords.flockId],
    references: [flocks.id],
  }),
  user: one(users, {
    fields: [dailyRecords.userId],
    references: [users.id],
  }),
}));

export const salesRelations = relations(sales, ({ one }) => ({
  farm: one(farms, {
    fields: [sales.farmId],
    references: [farms.id],
  }),
  user: one(users, {
    fields: [sales.userId],
    references: [users.id],
  }),
}));

export const feedInventoryRelations = relations(feedInventory, ({ one }) => ({
  farm: one(farms, {
    fields: [feedInventory.farmId],
    references: [farms.id],
  }),
  user: one(users, {
    fields: [feedInventory.userId],
    references: [users.id],
  }),
}));

export const healthRecordsRelations = relations(healthRecords, ({ one }) => ({
  flock: one(flocks, {
    fields: [healthRecords.flockId],
    references: [flocks.id],
  }),
  user: one(users, {
    fields: [healthRecords.userId],
    references: [users.id],
  }),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  farm: one(farms, {
    fields: [expenses.farmId],
    references: [farms.id],
  }),
  user: one(users, {
    fields: [expenses.userId],
    references: [users.id],
  }),
}));

export const breakEvenAssumptionsRelations = relations(breakEvenAssumptions, ({ one }) => ({
  farm: one(farms, {
    fields: [breakEvenAssumptions.farmId],
    references: [farms.id],
  }),
  product: one(products, {
    fields: [breakEvenAssumptions.productId],
    references: [products.id],
  }),
}));

// Marketplace relations
export const customersRelations = relations(customers, ({ one, many }) => ({
  user: one(users, {
    fields: [customers.userId],
    references: [users.id],
  }),
  orders: many(orders),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  farm: one(farms, {
    fields: [products.farmId],
    references: [farms.id],
  }),
  orderItems: many(orderItems),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  farm: one(farms, {
    fields: [orders.farmId],
    references: [farms.id],
  }),
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  orderItems: many(orderItems),
  delivery: one(deliveries),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const deliveriesRelations = relations(deliveries, ({ one }) => ({
  order: one(orders, {
    fields: [deliveries.orderId],
    references: [orders.id],
  }),
  driver: one(users, {
    fields: [deliveries.driverId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertFarmSchema = createInsertSchema(farms).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertManagerUserSchema = insertUserSchema.omit({ role: true }).extend({
  role: z.enum(["staff", "customer"])
});
export const insertFlockSchema = createInsertSchema(flocks).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDailyRecordSchema = createInsertSchema(dailyRecords).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  // Review system fields - server only
  reviewStatus: true,
  isDuplicate: true,
  duplicateOfId: true,
  reviewerId: true,
  reviewNote: true,
  reviewedAt: true,
});
export const insertSaleSchema = createInsertSchema(sales).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  saleDate: z.string().min(1, "Sale date is required"),
  pricePerCrate: z.number().positive("Price per crate must be positive"),
  totalAmount: z.number().positive("Total amount must be positive"),
});
export const insertFeedInventorySchema = createInsertSchema(feedInventory).omit({ id: true, createdAt: true, updatedAt: true });
export const insertHealthRecordSchema = createInsertSchema(healthRecords).omit({ id: true, createdAt: true, updatedAt: true });
export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBreakEvenAssumptionsSchema = createInsertSchema(breakEvenAssumptions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true, updatedAt: true });

// Marketplace insert schemas
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true, updatedAt: true });

// SECURITY: Remove client-supplied pricing fields - these must be server-calculated only
export const insertOrderSchema = createInsertSchema(orders).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  totalAmount: true,    // Server-calculated from order items
  paidAmount: true      // Managed separately for payment tracking
});

// SECURITY: Remove client-supplied pricing fields - these must be server-calculated only
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ 
  id: true, 
  createdAt: true,
  unitPrice: true,      // Server-fetched from current product price
  totalPrice: true      // Server-calculated: quantity * unitPrice
});

export const insertDeliverySchema = createInsertSchema(deliveries).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  scheduledDate: z.union([z.date(), z.string().transform((str) => str ? new Date(str) : undefined)]).optional(),
  actualDate: z.union([z.date(), z.string().transform((str) => str ? new Date(str) : undefined)]).optional(),
});

// Types
// Farm types
export type InsertFarm = z.infer<typeof insertFarmSchema>;
export type Farm = typeof farms.$inferSelect;

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertManagerUser = z.infer<typeof insertManagerUserSchema>;
export type InsertFlock = z.infer<typeof insertFlockSchema>;
export type Flock = typeof flocks.$inferSelect;
export type InsertDailyRecord = z.infer<typeof insertDailyRecordSchema>;
export type DailyRecord = typeof dailyRecords.$inferSelect;
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type Sale = typeof sales.$inferSelect;
export type InsertFeedInventory = z.infer<typeof insertFeedInventorySchema>;
export type FeedInventory = typeof feedInventory.$inferSelect;
export type InsertHealthRecord = z.infer<typeof insertHealthRecordSchema>;
export type HealthRecord = typeof healthRecords.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertBreakEvenAssumptions = z.infer<typeof insertBreakEvenAssumptionsSchema>;
export type BreakEvenAssumptions = typeof breakEvenAssumptions.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// Weight Records table - for detailed bird weight tracking
export const weightRecords = pgTable("weight_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  flockId: varchar("flock_id").notNull().references(() => flocks.id, { onDelete: "cascade" }),
  weekNumber: integer("week_number").notNull(),
  recordDate: date("record_date").notNull(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  
  // Raw weight data
  weights: jsonb("weights").notNull(), // Array of individual bird weights as numbers
  sampleSize: integer("sample_size").notNull(),
  
  // Calculated statistics
  averageWeight: decimal("average_weight", { precision: 6, scale: 2 }).notNull(),
  stdDev: decimal("std_dev", { precision: 6, scale: 2 }).notNull(),
  uniformity: decimal("uniformity", { precision: 5, scale: 2 }).notNull(), // Percentage
  cvPercent: decimal("cv_percent", { precision: 5, scale: 2 }), // Coefficient of Variation percentage
  
  // Breed standard comparison
  comparisonResult: varchar("comparison_result"), // "below_standard", "within_standard", "above_standard"
  expectedWeight: decimal("expected_weight", { precision: 6, scale: 2 }), // From breed standards
  weightDeviation: decimal("weight_deviation", { precision: 6, scale: 2 }), // Difference from standard
  
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_weight_records_flock_id").on(table.flockId),
  index("idx_weight_records_user_id").on(table.userId),
  index("idx_weight_records_week").on(table.weekNumber),
  uniqueIndex("uniq_weight_records_flock_week").on(table.flockId, table.weekNumber),
  check("chk_weight_records_positive", sql`
    week_number > 0 and 
    sample_size > 0 and 
    average_weight > 0 and 
    std_dev >= 0 and 
    uniformity >= 0 and uniformity <= 100
  `),
]);

// Breed Standards table - reference data for weight comparisons
export const breedStandards = pgTable("breed_standards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  breedName: varchar("breed_name").notNull(),
  weekNumber: integer("week_number").notNull(),
  standardWeight: decimal("standard_weight", { precision: 6, scale: 2 }).notNull(), // kg
  toleranceLower: decimal("tolerance_lower", { precision: 6, scale: 2 }).notNull(), // kg below standard
  toleranceUpper: decimal("tolerance_upper", { precision: 6, scale: 2 }).notNull(), // kg above standard
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_breed_standards_breed").on(table.breedName),
  index("idx_breed_standards_week").on(table.weekNumber),
  uniqueIndex("uniq_breed_standards_breed_week").on(table.breedName, table.weekNumber),
  check("chk_breed_standards_positive", sql`
    week_number > 0 and 
    standard_weight > 0 and 
    tolerance_lower >= 0 and 
    tolerance_upper >= 0
  `),
]);

// Weight Records insert schema
export const insertWeightRecordSchema = createInsertSchema(weightRecords, {
  weights: z.array(z.number().positive()).min(1).max(1000), // Array of positive numbers, max 1000 birds
  sampleSize: z.number().int().positive().max(1000),
  averageWeight: z.coerce.number().positive(),
  stdDev: z.coerce.number().min(0),
  uniformity: z.coerce.number().min(0).max(100),
  cvPercent: z.coerce.number().min(0).max(999.99).optional(), // CV% can be 0 in edge cases
  weekNumber: z.number().int().positive().max(100),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Breed Standards insert schema  
export const insertBreedStandardSchema = createInsertSchema(breedStandards, {
  standardWeight: z.number().positive(),
  toleranceLower: z.number().min(0),
  toleranceUpper: z.number().min(0),
  weekNumber: z.number().int().positive().max(100),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Marketplace types
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItems.$inferSelect;
export type InsertDelivery = z.infer<typeof insertDeliverySchema>;
export type Delivery = typeof deliveries.$inferSelect;

// Weight tracking types
export type InsertWeightRecord = z.infer<typeof insertWeightRecordSchema>;
export type WeightRecord = typeof weightRecords.$inferSelect;
export type InsertBreedStandard = z.infer<typeof insertBreedStandardSchema>;
export type BreedStandard = typeof breedStandards.$inferSelect;
