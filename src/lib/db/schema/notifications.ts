// Notification & Activity Tables Schema

import { relations } from 'drizzle-orm';
import { boolean, inet, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from './auth';
import { customers } from './customers';

// Notifications
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  recipientId: uuid('recipient_id').references(() => users.id, { onDelete: 'cascade' }),
  recipientCustomerId: uuid('recipient_customer_id').references(() => customers.id, {
    onDelete: 'cascade',
  }),
  title: varchar('title', { length: 200 }).notNull(),
  message: text('message').notNull(),
  type: varchar('type', { length: 50 }).notNull(), // order_update, inquiry_assigned, quotation_sent
  entityType: varchar('entity_type', { length: 50 }), // order, inquiry, quotation
  entityId: uuid('entity_id'),
  isRead: boolean('is_read').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Activity logs
export const activityLogs = pgTable('activity_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 100 }).notNull(),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: uuid('entity_id').notNull(),
  details: jsonb('details'),
  ipAddress: inet('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Relations
export const notificationsRelations = relations(notifications, () => ({
  // Relations will be defined in other schema files that reference notifications
}));

export const activityLogsRelations = relations(activityLogs, () => ({
  // Relations will be defined in other schema files that reference activity logs
}));
