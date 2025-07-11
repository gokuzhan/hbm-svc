// Product Management Tables Schema

import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  check,
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
import { media } from './media';

// Order types (predefined: Private Label, White Label, Fabric)
export const orderTypes = pgTable(
  'order_types',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 50 }).notNull().unique(),
    description: text('description'),
    isActive: boolean('is_active').default(true),
    supportsProducts: boolean('supports_products').default(true), // false for Private Label
    supportsVariableProducts: boolean('supports_variable_products').default(false), // true for order types that allow variable products
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [index('idx_order_types_supports_variable').on(table.supportsVariableProducts)]
);

// Products table
export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 200 }).notNull(),
    description: text('description'),
    sku: varchar('sku', { length: 100 }).unique(),
    orderTypeId: uuid('order_type_id')
      .notNull()
      .references(() => orderTypes.id, { onDelete: 'restrict' }),
    isVariable: boolean('is_variable').default(false), // true for products with variants
    isActive: boolean('is_active').default(true),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_products_order_type').on(table.orderTypeId),
    unique('unique_name_per_order_type').on(table.name, table.orderTypeId),
    // Note: Variable product order type validation moved to application logic
    // Check constraints cannot use subqueries in PostgreSQL
  ]
);

// Product variants (for variable products)
export const productVariants = pgTable(
  'product_variants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 200 }).notNull(), // e.g., "Black, Small"
    variantIdentifier: varchar('variant_identifier', { length: 100 }).notNull().unique(), // e.g., "TSHIRT-BLACK-S"
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_product_variants_product_id').on(table.productId),
    index('idx_product_variants_identifier').on(table.variantIdentifier),
    unique('unique_variant_identifier').on(table.variantIdentifier),
    unique('unique_variant_per_product').on(table.productId, table.name),
  ]
);

// Product media files (direct relationship)
export const productMedias = pgTable(
  'product_medias',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    mediaId: uuid('media_id')
      .notNull()
      .references(() => media.id, { onDelete: 'cascade' }),
    isPrimary: boolean('is_primary').default(false),
    sortOrder: integer('sort_order').default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_product_medias_product').on(table.productId),
    index('idx_product_medias_media').on(table.mediaId),
    unique().on(table.productId, table.mediaId),
  ]
);

// Product attribute definitions (for dynamic product attributes)
export const productAttributeDefinitions = pgTable(
  'product_attribute_definitions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull().unique(),
    displayName: varchar('display_name', { length: 200 }).notNull(),
    attributeType: varchar('attribute_type', { length: 50 }).notNull(), // text, select, number, color, boolean
    predefinedValues: jsonb('predefined_values'), // for select type: [{"value": "red", "label": "Red"}, {"value": "blue", "label": "Blue"}]
    validationRules: jsonb('validation_rules'), // validation rules: {"min": 1, "max": 100, "required": true}
    isVariantAttribute: boolean('is_variant_attribute').default(false), // true if used for generating product variants
    sortOrder: integer('sort_order').default(0),
    isActive: boolean('is_active').default(true),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_product_attribute_definitions_name').on(table.name),
    index('idx_product_attribute_definitions_type').on(table.attributeType),
    index('idx_product_attribute_definitions_variant').on(table.isVariantAttribute),
  ]
);

// Product attributes (actual attribute values for each product)
export const productAttributes = pgTable(
  'product_attributes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    attributeDefinitionId: uuid('attribute_definition_id')
      .notNull()
      .references(() => productAttributeDefinitions.id, { onDelete: 'restrict' }),
    attributeValue: varchar('attribute_value', { length: 200 }), // stores predefined value (references predefined_values in definition)
    customValue: text('custom_value'), // stores custom value when not using predefined options
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_product_attributes_product').on(table.productId),
    index('idx_product_attributes_definition').on(table.attributeDefinitionId),
    index('idx_product_attributes_value').on(table.attributeValue),
    unique('unique_product_attribute').on(table.productId, table.attributeDefinitionId),
    // Product attribute constraints
    check(
      'check_attribute_value_required',
      sql`(${table.attributeValue} IS NOT NULL AND TRIM(${table.attributeValue}) != '') OR (${table.customValue} IS NOT NULL AND TRIM(${table.customValue}) != '')`
    ),
    check(
      'check_attribute_value_exclusive',
      sql`(${table.attributeValue} IS NOT NULL AND ${table.customValue} IS NULL) OR (${table.attributeValue} IS NULL AND ${table.customValue} IS NOT NULL)`
    ),
  ]
);

// Add required imports for constraints

// Relations
export const orderTypesRelations = relations(orderTypes, ({ many }) => ({
  products: many(products),
}));

// Product lookup view for easy querying of products with attributes and variants
export const productsRelations = relations(products, ({ one, many }) => ({
  orderType: one(orderTypes, {
    fields: [products.orderTypeId],
    references: [orderTypes.id],
  }),
  variants: many(productVariants),
  medias: many(productMedias),
  attributes: many(productAttributes),
}));

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id],
  }),
}));

export const productMediasRelations = relations(productMedias, ({ one }) => ({
  product: one(products, {
    fields: [productMedias.productId],
    references: [products.id],
  }),
}));

export const productAttributeDefinitionsRelations = relations(
  productAttributeDefinitions,
  ({ many }) => ({
    attributes: many(productAttributes),
  })
);

export const productAttributesRelations = relations(productAttributes, ({ one }) => ({
  product: one(products, {
    fields: [productAttributes.productId],
    references: [products.id],
  }),
  definition: one(productAttributeDefinitions, {
    fields: [productAttributes.attributeDefinitionId],
    references: [productAttributeDefinitions.id],
  }),
}));
