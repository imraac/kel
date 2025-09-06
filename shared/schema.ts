import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import {
  index,
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
  role: varchar("role").notNull().default("staff"), // admin, staff
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Flocks table
export const flocks = pgTable("flocks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  breed: varchar("breed"),
  initialCount: integer("initial_count").notNull(),
  currentCount: integer("current_count").notNull(),
  hatchDate: date("hatch_date").notNull(),
  status: varchar("status").notNull().default("brooding"), // brooding, laying, retired
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Daily records table
export const dailyRecords = pgTable("daily_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  flockId: varchar("flock_id").notNull(),
  recordDate: date("record_date").notNull(),
  userId: varchar("user_id").notNull(),
  
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
  temperature: decimal("temperature", { precision: 4, scale: 1 }),
  lightingHours: decimal("lighting_hours", { precision: 3, scale: 1 }),
  
  // Weight tracking
  averageWeight: decimal("average_weight", { precision: 6, scale: 2 }),
  sampleSize: integer("sample_size"),
  
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sales table
export const sales = pgTable("sales", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  saleDate: date("sale_date").notNull(),
  userId: varchar("user_id").notNull(),
  customerName: varchar("customer_name"),
  cratesSold: integer("crates_sold").notNull(),
  pricePerCrate: decimal("price_per_crate", { precision: 10, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paymentStatus: varchar("payment_status").notNull().default("pending"), // pending, paid, overdue
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Feed inventory table
export const feedInventory = pgTable("feed_inventory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  feedType: varchar("feed_type").notNull(),
  supplier: varchar("supplier"),
  quantityKg: decimal("quantity_kg", { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }),
  purchaseDate: date("purchase_date"),
  expiryDate: date("expiry_date"),
  userId: varchar("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Health records table
export const healthRecords = pgTable("health_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  flockId: varchar("flock_id").notNull(),
  recordDate: date("record_date").notNull(),
  userId: varchar("user_id").notNull(),
  recordType: varchar("record_type").notNull(), // vaccination, medication, treatment, checkup
  title: varchar("title").notNull(),
  description: text("description"),
  medicationUsed: varchar("medication_used"),
  dosage: varchar("dosage"),
  administeredBy: varchar("administered_by"),
  nextDueDate: date("next_due_date"),
  cost: decimal("cost", { precision: 10, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Expenses table
export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  expenseDate: date("expense_date").notNull(),
  userId: varchar("user_id").notNull(),
  category: varchar("category").notNull(), // feed, medication, labor, utilities, equipment, other
  description: varchar("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  supplier: varchar("supplier"),
  receiptNumber: varchar("receipt_number"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Customers table for marketplace
export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  email: varchar("email").unique(),
  phone: varchar("phone").notNull(),
  address: text("address"),
  businessType: varchar("business_type"), // retailer, restaurant, individual, distributor
  preferredContactMethod: varchar("preferred_contact_method").default("phone"), // phone, email, whatsapp
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Advance bookings table
export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  userId: varchar("user_id").notNull(), // farm user who manages this booking
  bookingDate: date("booking_date").notNull(),
  deliveryDate: date("delivery_date").notNull(),
  cratesRequested: integer("crates_requested").notNull(),
  pricePerCrate: decimal("price_per_crate", { precision: 10, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  deposit: decimal("deposit", { precision: 10, scale: 2 }).default("0"),
  status: varchar("status").notNull().default("pending"), // pending, confirmed, fulfilled, cancelled
  priority: varchar("priority").default("normal"), // high, normal, low
  specialRequirements: text("special_requirements"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Customer demand/requests table
export const demandRequests = pgTable("demand_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  requestDate: date("request_date").notNull(),
  urgencyLevel: varchar("urgency_level").notNull().default("normal"), // urgent, normal, flexible
  cratesNeeded: integer("crates_needed").notNull(),
  maxPricePerCrate: decimal("max_price_per_crate", { precision: 10, scale: 2 }),
  preferredDeliveryDate: date("preferred_delivery_date"),
  flexibleDelivery: boolean("flexible_delivery").default(false),
  description: text("description"),
  status: varchar("status").notNull().default("open"), // open, matched, fulfilled, expired
  matchedBookingId: varchar("matched_booking_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const flocksRelations = relations(flocks, ({ many }) => ({
  dailyRecords: many(dailyRecords),
  healthRecords: many(healthRecords),
}));

export const usersRelations = relations(users, ({ many }) => ({
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
  user: one(users, {
    fields: [sales.userId],
    references: [users.id],
  }),
}));

export const feedInventoryRelations = relations(feedInventory, ({ one }) => ({
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
  user: one(users, {
    fields: [expenses.userId],
    references: [users.id],
  }),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  bookings: many(bookings),
  demandRequests: many(demandRequests),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  customer: one(customers, {
    fields: [bookings.customerId],
    references: [customers.id],
  }),
  user: one(users, {
    fields: [bookings.userId],
    references: [users.id],
  }),
}));

export const demandRequestsRelations = relations(demandRequests, ({ one }) => ({
  customer: one(customers, {
    fields: [demandRequests.customerId],
    references: [customers.id],
  }),
  matchedBooking: one(bookings, {
    fields: [demandRequests.matchedBookingId],
    references: [bookings.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFlockSchema = createInsertSchema(flocks).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDailyRecordSchema = createInsertSchema(dailyRecords).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSaleSchema = createInsertSchema(sales).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFeedInventorySchema = createInsertSchema(feedInventory).omit({ id: true, createdAt: true, updatedAt: true });
export const insertHealthRecordSchema = createInsertSchema(healthRecords).omit({ id: true, createdAt: true, updatedAt: true });
export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDemandRequestSchema = createInsertSchema(demandRequests).omit({ id: true, createdAt: true, updatedAt: true });

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
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
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertDemandRequest = z.infer<typeof insertDemandRequestSchema>;
export type DemandRequest = typeof demandRequests.$inferSelect;
