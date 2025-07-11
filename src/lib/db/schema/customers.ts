// Customer Management Tables Schema

import { relations } from 'drizzle-orm';
import { boolean, index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from './auth';
import { media } from './media';

// Customers table
export const customers = pgTable(
  'customers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    phone: varchar('phone', { length: 20 }),
    companyName: varchar('company_name', { length: 200 }),
    brandName: varchar('brand_name', { length: 200 }),
    address: text('address'),
    city: varchar('city', { length: 100 }),
    state: varchar('state', { length: 100 }),
    country: varchar('country', { length: 100 }),
    postalCode: varchar('postal_code', { length: 20 }),
    profileMediaId: uuid('profile_media_id').references(() => media.id, { onDelete: 'set null' }),
    isActive: boolean('is_active').default(true),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_customers_email').on(table.email),
    index('idx_customers_profile_media').on(table.profileMediaId),
  ]
);

// Customer authentication for mobile app
export const customerAuth = pgTable('customer_auth', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id, { onDelete: 'cascade' }),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  lastLogin: timestamp('last_login', { withTimezone: true }),
  isVerified: boolean('is_verified').default(false),
  verificationToken: varchar('verification_token', { length: 255 }),
  resetToken: varchar('reset_token', { length: 255 }),
  resetTokenExpires: timestamp('reset_token_expires', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Relations
export const customersRelations = relations(customers, ({ one }) => ({
  customerAuth: one(customerAuth),
}));

export const customerAuthRelations = relations(customerAuth, ({ one }) => ({
  customer: one(customers, {
    fields: [customerAuth.customerId],
    references: [customers.id],
  }),
}));
