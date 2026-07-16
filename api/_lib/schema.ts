import {
  integer,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
  text,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkUserId: varchar("clerk_user_id", { length: 128 }).notNull().unique(),
  email: text("email"),
  stripeCustomerId: varchar("stripe_customer_id", { length: 128 }).unique(),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 128 }).unique(),
  subscriptionStatus: varchar("subscription_status", { length: 32 })
    .notNull()
    .default("none"),
  subscriptionPeriodEnd: timestamp("subscription_period_end", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userSettings = pgTable("user_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  schemaVersion: integer("schema_version").notNull().default(2),
  settings: jsonb("settings").notNull(),
  clientUpdatedAt: timestamp("client_updated_at", { withTimezone: true }),
  serverUpdatedAt: timestamp("server_updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type User = typeof users.$inferSelect;
export type UserSettingsRow = typeof userSettings.$inferSelect;
