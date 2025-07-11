// Order Management Tables Schema

import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  check,
  decimal,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from './auth';
import { customers } from './customers';
import { inquiries } from './inquiries';
import { media } from './media';
import { orderTypes, productVariants } from './products';

// Orders table (status computed from datetime fields and quotation data)
export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderNumber: varchar('order_number', { length: 100 }).notNull().unique(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    inquiryId: uuid('inquiry_id').references(() => inquiries.id, { onDelete: 'set null' }),
    orderTypeId: uuid('order_type_id').references(() => orderTypes.id, { onDelete: 'restrict' }),
    productionStageId: uuid('production_stage_id').references(() => productionStages.id, {
      onDelete: 'set null',
    }),
    amount: decimal('amount', { precision: 10, scale: 2 }),
    notes: text('notes'),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    // Status computed from these datetime fields and quotation data
    quotedAt: timestamp('quoted_at', { withTimezone: true }),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    productionStartedAt: timestamp('production_started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    shippedAt: timestamp('shipped_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    canceledAt: timestamp('canceled_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_orders_customer').on(table.customerId),
    index('idx_orders_datetime_fields').on(
      table.quotedAt,
      table.confirmedAt,
      table.completedAt,
      table.shippedAt,
      table.deliveredAt,
      table.canceledAt
    ),
    index('idx_orders_order_type').on(table.orderTypeId),
    index('idx_orders_production_stage').on(table.productionStageId),
    // Date logic constraints
    check(
      'check_confirmed_after_quoted',
      sql`${table.confirmedAt} IS NULL OR ${table.quotedAt} IS NULL OR ${table.confirmedAt} >= ${table.quotedAt}`
    ),
    check(
      'check_completed_after_production',
      sql`${table.completedAt} IS NULL OR ${table.productionStartedAt} IS NULL OR ${table.completedAt} >= ${table.productionStartedAt}`
    ),
    check(
      'check_shipped_after_completed',
      sql`${table.shippedAt} IS NULL OR ${table.completedAt} IS NULL OR ${table.shippedAt} >= ${table.completedAt}`
    ),
    check(
      'check_delivered_after_shipped',
      sql`${table.deliveredAt} IS NULL OR ${table.shippedAt} IS NULL OR ${table.deliveredAt} >= ${table.shippedAt}`
    ),
  ]
);

// Order items (for product variants or custom items)
export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    productVariantId: uuid('product_variant_id').references(() => productVariants.id, {
      onDelete: 'restrict',
    }),
    itemName: varchar('item_name', { length: 200 }).notNull(),
    itemDescription: text('item_description'),
    quantity: integer('quantity').notNull().default(1),
    specifications: jsonb('specifications'), // individual item specifications: {"color": "custom-red", "size": "large", "custom_embroidery": "Company Logo"}
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_order_items_specifications').using('gin', table.specifications),
    // Positive quantity constraint
    check('check_positive_quantity', sql`${table.quantity} > 0`),
  ]
);

// Order specification definitions (dynamic fields for order types)
export const orderSpecificationDefinitions = pgTable(
  'order_specification_definitions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderTypeId: uuid('order_type_id')
      .notNull()
      .references(() => orderTypes.id, { onDelete: 'restrict' }),
    fieldName: varchar('field_name', { length: 100 }).notNull(),
    fieldType: varchar('field_type', { length: 50 }).notNull(), // text, email, phone, select, textarea, number, date
    fieldLabel: varchar('field_label', { length: 200 }).notNull(),
    isRequired: boolean('is_required').default(false),
    validationRules: jsonb('validation_rules'), // validation rules for the field
    fieldOptions: jsonb('field_options'), // for select fields
    sortOrder: integer('sort_order').default(0),
    isActive: boolean('is_active').default(true),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_order_specification_definitions_order_type').on(table.orderTypeId),
    unique('unique_field_per_order_type').on(table.orderTypeId, table.fieldName),
  ]
);

// Order specification values (dynamic field values for each order)
export const orderSpecificationValues = pgTable(
  'order_specification_values',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    specificationDefinitionId: uuid('specification_definition_id')
      .notNull()
      .references(() => orderSpecificationDefinitions.id, { onDelete: 'restrict' }),
    fieldValue: text('field_value'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [index('idx_order_specification_values_order').on(table.orderId)]
);

// Order quotations
export const orderQuotations = pgTable(
  'order_quotations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    quotationNumber: varchar('quotation_number', { length: 100 }).notNull().unique(),
    version: integer('version').notNull().default(1),
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    quotationMediaId: uuid('quotation_media_id').references(() => media.id, {
      onDelete: 'set null',
    }),
    notes: text('notes'),
    isAccepted: boolean('is_accepted').default(false),
    validUntil: timestamp('valid_until', { withTimezone: true }),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_order_quotations_media').on(table.quotationMediaId),
    // Positive amount constraint
    check('check_positive_amount', sql`${table.amount} > 0`),
  ]
);

// Order status history (tracking status changes based on datetime fields)
export const orderStatusHistory = pgTable('order_status_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  previousStatus: varchar('previous_status', { length: 50 }),
  newStatus: varchar('new_status', { length: 50 }).notNull(),
  changedBy: uuid('changed_by').references(() => users.id, { onDelete: 'set null' }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Dynamic production stages
export const productionStages = pgTable(
  'production_stages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    orderTypeId: uuid('order_type_id')
      .notNull()
      .references(() => orderTypes.id, { onDelete: 'restrict' }),
    sortOrder: integer('sort_order').default(0),
    isActive: boolean('is_active').default(true),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [index('idx_production_stages_order_type').on(table.orderTypeId)]
);

// Order attachments (direct relationship)
export const orderAttachments = pgTable(
  'order_attachments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    mediaId: uuid('media_id')
      .notNull()
      .references(() => media.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_order_attachments_order').on(table.orderId),
    index('idx_order_attachments_media').on(table.mediaId),
    unique().on(table.orderId, table.mediaId),
  ]
);

// Relations
export const ordersRelations = relations(orders, ({ one, many }) => ({
  // One-to-one relationships
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  inquiry: one(inquiries, {
    fields: [orders.inquiryId],
    references: [inquiries.id],
  }),
  orderType: one(orderTypes, {
    fields: [orders.orderTypeId],
    references: [orderTypes.id],
  }),
  productionStage: one(productionStages, {
    fields: [orders.productionStageId],
    references: [productionStages.id],
  }),
  createdByUser: one(users, {
    fields: [orders.createdBy],
    references: [users.id],
  }),
  // One-to-many relationships
  items: many(orderItems),
  quotations: many(orderQuotations),
  statusHistory: many(orderStatusHistory),
  attachments: many(orderAttachments),
  specificationValues: many(orderSpecificationValues),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
}));

export const orderSpecificationDefinitionsRelations = relations(
  orderSpecificationDefinitions,
  ({ many }) => ({
    values: many(orderSpecificationValues),
  })
);

export const orderSpecificationValuesRelations = relations(orderSpecificationValues, ({ one }) => ({
  order: one(orders, {
    fields: [orderSpecificationValues.orderId],
    references: [orders.id],
  }),
  definition: one(orderSpecificationDefinitions, {
    fields: [orderSpecificationValues.specificationDefinitionId],
    references: [orderSpecificationDefinitions.id],
  }),
}));

export const orderQuotationsRelations = relations(orderQuotations, ({ one }) => ({
  order: one(orders, {
    fields: [orderQuotations.orderId],
    references: [orders.id],
  }),
}));

export const orderStatusHistoryRelations = relations(orderStatusHistory, ({ one }) => ({
  order: one(orders, {
    fields: [orderStatusHistory.orderId],
    references: [orders.id],
  }),
}));

export const productionStagesRelations = relations(productionStages, ({ many }) => ({
  orders: many(orders),
}));

export const orderAttachmentsRelations = relations(orderAttachments, ({ one }) => ({
  order: one(orders, {
    fields: [orderAttachments.orderId],
    references: [orders.id],
  }),
}));
