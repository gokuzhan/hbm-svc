// Inquiry Management Tables Schema

import { relations, sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from './auth';
import { customers } from './customers';
import { media } from './media';
import { orderTypes } from './products';

// Inquiries table (status computed from integer field and datetime fields)
export const inquiries = pgTable(
  'inquiries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerName: varchar('customer_name', { length: 200 }).notNull(),
    customerEmail: varchar('customer_email', { length: 255 }).notNull(),
    customerPhone: varchar('customer_phone', { length: 20 }),
    companyName: varchar('company_name', { length: 200 }),
    brandName: varchar('brand_name', { length: 200 }),
    serviceType: uuid('service_type').references(() => orderTypes.id, { onDelete: 'set null' }), // references order_types
    message: text('message').notNull(),
    status: integer('status').default(1), // 0=rejected, 1=new, 2=accepted, 3=in_progress, 4=closed
    assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }), // null if created by customer
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    rejectedAt: timestamp('rejected_at', { withTimezone: true }),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_inquiries_status_assigned').on(table.status, table.assignedTo),
    index('idx_inquiries_customer').on(table.customerId),
    index('idx_inquiries_datetime_fields').on(table.acceptedAt, table.rejectedAt, table.closedAt),
    // Inquiry status range constraint
    check('check_inquiry_status_range', sql`${table.status} >= 0 AND ${table.status} <= 4`),
  ]
);

// Inquiry status history
export const inquiryStatusHistory = pgTable('inquiry_status_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  inquiryId: uuid('inquiry_id')
    .notNull()
    .references(() => inquiries.id, { onDelete: 'cascade' }),
  previousStatus: integer('previous_status'),
  newStatus: integer('new_status').notNull(),
  changedBy: uuid('changed_by').references(() => users.id, { onDelete: 'set null' }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Inquiry attachments (direct relationship)
export const inquiryAttachments = pgTable(
  'inquiry_attachments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    inquiryId: uuid('inquiry_id')
      .notNull()
      .references(() => inquiries.id, { onDelete: 'cascade' }),
    mediaId: uuid('media_id')
      .notNull()
      .references(() => media.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_inquiry_attachments_inquiry').on(table.inquiryId),
    index('idx_inquiry_attachments_media').on(table.mediaId),
    unique().on(table.inquiryId, table.mediaId),
  ]
);

// Relations
export const inquiriesRelations = relations(inquiries, ({ many }) => ({
  statusHistory: many(inquiryStatusHistory),
  attachments: many(inquiryAttachments),
}));

export const inquiryStatusHistoryRelations = relations(inquiryStatusHistory, ({ one }) => ({
  inquiry: one(inquiries, {
    fields: [inquiryStatusHistory.inquiryId],
    references: [inquiries.id],
  }),
}));

export const inquiryAttachmentsRelations = relations(inquiryAttachments, ({ one }) => ({
  inquiry: one(inquiries, {
    fields: [inquiryAttachments.inquiryId],
    references: [inquiries.id],
  }),
}));
