// Product Business Rules Implementation
// HBM Service Layer - Product-specific Business Rules

import { OrderType, Product, ProductVariant } from '@/types';
import { validateProductForOrderType, validateVariableProductSupport } from './order-type-rules';
import {
  BusinessRuleValidationResult,
  ProductAttributeValidationContext,
  ProductValidationContext
} from './types';

/**
 * Validates all product business rules
 */
export function validateProductBusinessRules(
  product: Product,
  orderType: OrderType,
  isCreating: boolean = false
): BusinessRuleValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const context: ProductValidationContext = {
    product,
    orderType,
    isCreating,
    isUpdating: !isCreating,
  };

  // Rule 1: Order type compatibility validation
  const orderTypeValidation = validateProductForOrderType(context);
  errors.push(...orderTypeValidation.errors);
  warnings.push(...orderTypeValidation.warnings);

  // Rule 2: Variable product order type validation
  const variableProductValidation = validateVariableProductSupport(orderType, product.isVariable);
  errors.push(...variableProductValidation.errors);
  warnings.push(...variableProductValidation.warnings);

  // Rule 3: Product name uniqueness per order type (handled at repository level)
  // This is enforced by the database constraint: unique_name_per_order_type

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates product variant business rules
 */
export function validateProductVariantBusinessRules(
  variant: ProductVariant,
  product: Product,
  orderType: OrderType
): BusinessRuleValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Rule 1: Variants can only be created for variable products
  if (!product.isVariable) {
    errors.push('Product variants can only be created for variable products');
  }

  // Rule 2: Order type must support variable products
  if (!orderType.supportsVariableProducts) {
    errors.push(
      `Product variants cannot be created for order type '${orderType.name}' as it does not support variable products`
    );
  }

  // Rule 3: Variant identifier uniqueness (handled at database level)
  // This is enforced by the database constraint: unique variant_identifier

  // Rule 4: Variant name uniqueness per product (handled at database level)
  // This is enforced by the database constraint: unique(product_id, name)

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates product attribute business rules
 */
export function validateProductAttributeBusinessRules(
  context: ProductAttributeValidationContext
): BusinessRuleValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Rule 1: Either predefined value OR custom value required (not both)
  const hasAttributeValue = context.attributeValue && context.attributeValue.trim() !== '';
  const hasCustomValue = context.customValue && context.customValue.trim() !== '';

  if (!hasAttributeValue && !hasCustomValue) {
    errors.push('Product attribute must have either a predefined value or custom value');
  }

  if (hasAttributeValue && hasCustomValue) {
    errors.push('Product attribute cannot have both predefined and custom values');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates product deletion business rules
 */
export function validateProductDeletionBusinessRules(
  product: Product,
  hasVariants: boolean,
  hasOrderItems: boolean = false
): BusinessRuleValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Rule 1: Cannot delete product with existing variants
  if (hasVariants) {
    errors.push('Cannot delete product with existing variants. Remove all variants first.');
  }

  // Rule 2: Warning for products with order items
  if (hasOrderItems) {
    warnings.push(
      'This product is referenced in existing orders. Deletion may affect order data integrity.'
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates product SKU business rules
 */
export function validateProductSKUBusinessRules(
  sku: string | undefined
  // isUpdating and existingProductId reserved for future implementation
): BusinessRuleValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (sku) {
    // Rule 1: SKU format validation
    const skuPattern = /^[A-Z0-9-_]+$/;
    if (!skuPattern.test(sku)) {
      errors.push('SKU must contain only uppercase letters, numbers, hyphens, and underscores');
    }

    // Rule 2: SKU length validation
    if (sku.length < 3) {
      errors.push('SKU must be at least 3 characters long');
    }

    if (sku.length > 100) {
      errors.push('SKU cannot exceed 100 characters');
    }

    // Rule 3: SKU uniqueness (handled at repository level)
    // This is enforced by the database constraint and repository validation
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates product update business rules
 */
export function validateProductUpdateBusinessRules(
  currentProduct: Product,
  updateData: Partial<Product>,
  orderType: OrderType,
  hasVariants: boolean = false
): BusinessRuleValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Rule 1: Cannot change product from variable to non-variable if it has variants
  if (
    updateData.isVariable !== undefined &&
    currentProduct.isVariable &&
    !updateData.isVariable &&
    hasVariants
  ) {
    errors.push(
      'Cannot change product from variable to non-variable while it has variants. Remove all variants first.'
    );
  }

  // Rule 2: Cannot change product to variable if order type doesn't support it
  if (updateData.isVariable && !orderType.supportsVariableProducts) {
    errors.push(
      `Cannot make product variable for order type '${orderType.name}' as it does not support variable products`
    );
  }

  // Rule 3: Order type change validation
  if (updateData.orderTypeId && updateData.orderTypeId !== currentProduct.orderTypeId) {
    warnings.push(
      'Changing order type may affect existing business rules and relationships. Verify compatibility.'
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
