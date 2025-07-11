// Product Query Utilities
// Predefined queries for complex product lookups without requiring database views

import { and, eq, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import {
  orderTypes,
  productAttributeDefinitions,
  productAttributes,
  productMedias,
  products,
  productVariants,
} from '../schema/products';

// Database type for better type safety
type Database = PostgresJsDatabase<Record<string, never>>;

/**
 * Product lookup query builder - equivalent to a database view but more flexible
 * This provides comprehensive product data including variants, attributes, and media
 */
export const createProductLookupQuery = () => ({
  productId: products.id,
  productName: products.name,
  productDescription: products.description,
  productSku: products.sku,
  isVariable: products.isVariable,
  productActive: products.isActive,
  orderType: orderTypes.name,
  supportsVariableProducts: orderTypes.supportsVariableProducts,

  // Variant information (null for non-variable products)
  variantId: productVariants.id,
  variantName: productVariants.name,
  variantIdentifier: productVariants.variantIdentifier,
  variantActive: productVariants.isActive,

  // Attribute information
  attributeDefinitionId: productAttributeDefinitions.id,
  attributeName: productAttributeDefinitions.name,
  attributeDisplayName: productAttributeDefinitions.displayName,
  attributeType: productAttributeDefinitions.attributeType,
  isVariantAttribute: productAttributeDefinitions.isVariantAttribute,

  // Attribute values (prioritize custom_value over attribute_value)
  attributeValue: sql<string>`coalesce(${productAttributes.customValue}, ${productAttributes.attributeValue})`,
  predefinedValue: productAttributes.attributeValue,
  customValue: productAttributes.customValue,
});

/**
 * Get base product lookup query with all necessary joins
 *
 * @param db - Drizzle database instance
 * @returns Query builder for product lookup
 *
 * @example
 * ```typescript
 * const db = getDb();
 *
 * // Get all active products
 * const allProducts = await getProductLookupQuery(db);
 *
 * // Get products by order type
 * const whiteLabelProducts = await getProductLookupQuery(db)
 *   .where(eq(orderTypes.name, 'White Label'));
 *
 * // Get specific product with variants
 * const productWithVariants = await getProductLookupQuery(db)
 *   .where(eq(products.id, productId));
 * ```
 */
export const getProductLookupQuery = (db: Database) => {
  return db
    .select(createProductLookupQuery())
    .from(products)
    .leftJoin(orderTypes, eq(products.orderTypeId, orderTypes.id))
    .leftJoin(
      productVariants,
      and(eq(products.id, productVariants.productId), eq(productVariants.isActive, true))
    )
    .leftJoin(productAttributes, eq(products.id, productAttributes.productId))
    .leftJoin(
      productAttributeDefinitions,
      and(
        eq(productAttributes.attributeDefinitionId, productAttributeDefinitions.id),
        eq(productAttributeDefinitions.isActive, true)
      )
    )
    .where(eq(products.isActive, true));
};

/**
 * Get simplified product query without attributes (for performance)
 */
export const getSimpleProductQuery = (db: Database) => {
  return db
    .select({
      productId: products.id,
      productName: products.name,
      productDescription: products.description,
      productSku: products.sku,
      isVariable: products.isVariable,
      orderType: orderTypes.name,
      variantId: productVariants.id,
      variantName: productVariants.name,
      variantIdentifier: productVariants.variantIdentifier,
    })
    .from(products)
    .leftJoin(orderTypes, eq(products.orderTypeId, orderTypes.id))
    .leftJoin(
      productVariants,
      and(eq(products.id, productVariants.productId), eq(productVariants.isActive, true))
    )
    .where(eq(products.isActive, true));
};

/**
 * Get products with their primary media
 */
export const getProductsWithMediaQuery = (db: Database) => {
  return db
    .select({
      productId: products.id,
      productName: products.name,
      productSku: products.sku,
      orderType: orderTypes.name,
      primaryMediaId: productMedias.mediaId,
      isPrimary: productMedias.isPrimary,
    })
    .from(products)
    .leftJoin(orderTypes, eq(products.orderTypeId, orderTypes.id))
    .leftJoin(
      productMedias,
      and(eq(products.id, productMedias.productId), eq(productMedias.isPrimary, true))
    )
    .where(eq(products.isActive, true));
};
