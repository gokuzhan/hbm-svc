// Order Type Business Rules Implementation
// HBM Service Layer - Order Type Specific Business Rules

import { OrderType } from '@/types';
import {
  BusinessRuleValidationResult,
  ORDER_TYPE_NAMES,
  OrderTypeBusinessRules,
  OrderTypeName,
  OrderValidationContext,
  ProductValidationContext
} from './types';

/**
 * Gets the business rules configuration for an order type
 */
export function getOrderTypeRules(orderType: OrderType): OrderTypeBusinessRules {
  const rules: OrderTypeBusinessRules = {
    name: orderType.name,
    supportsProducts: orderType.supportsProducts,
    supportsVariableProducts: orderType.supportsVariableProducts,
    allowsProductAssociation: orderType.supportsProducts,
    allowsVariantAssociation: false,
    requiresProductAssociation: false,
    requiresVariantAssociation: false,
  };

  switch (orderType.name as OrderTypeName) {
    case ORDER_TYPE_NAMES.PRIVATE_LABEL:
      // Private Label: No product associations allowed
      rules.allowsProductAssociation = false;
      rules.allowsVariantAssociation = false;
      rules.requiresProductAssociation = false;
      rules.requiresVariantAssociation = false;
      break;

    case ORDER_TYPE_NAMES.WHITE_LABEL:
      // White Label: Must have product/variant associations
      rules.allowsProductAssociation = true;
      rules.allowsVariantAssociation = true;
      rules.requiresProductAssociation = true;
      rules.requiresVariantAssociation = true;
      break;

    case ORDER_TYPE_NAMES.FABRIC:
      // Fabric: Can have products but not variants
      rules.allowsProductAssociation = true;
      rules.allowsVariantAssociation = false;
      rules.requiresProductAssociation = false;
      rules.requiresVariantAssociation = false;
      break;

    default:
      // Custom order types: Follow the database configuration
      rules.allowsProductAssociation = orderType.supportsProducts;
      rules.allowsVariantAssociation = orderType.supportsVariableProducts;
      break;
  }

  return rules;
}

/**
 * Validates product business rules for an order type
 */
export function validateProductForOrderType(context: ProductValidationContext): BusinessRuleValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const rules = getOrderTypeRules(context.orderType);

  // Rule 1: Private Label orders cannot have product associations
  if (context.orderType.name === ORDER_TYPE_NAMES.PRIVATE_LABEL && context.product) {
    if (!rules.allowsProductAssociation) {
      errors.push(`${ORDER_TYPE_NAMES.PRIVATE_LABEL} orders cannot have product associations`);
    }
  }

  // Rule 2: Variable products only allowed for order types with supports_variable_products = true
  if (context.product?.isVariable && !context.orderType.supportsVariableProducts) {
    errors.push(
      `Variable products are not supported for order type: ${context.orderType.name}`
    );
  }

  // Rule 3: Products must be associated with order types that support products
  if (context.product && !rules.allowsProductAssociation) {
    errors.push(
      `Order type ${context.orderType.name} does not support product associations`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates order business rules for an order type
 */
export function validateOrderForOrderType(context: OrderValidationContext): BusinessRuleValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const rules = getOrderTypeRules(context.orderType);

  // Rule 1: White Label orders must have product/variant associations
  if (context.orderType.name === ORDER_TYPE_NAMES.WHITE_LABEL) {
    if (rules.requiresProductAssociation && (!context.orderItems || context.orderItems.length === 0)) {
      errors.push(`${ORDER_TYPE_NAMES.WHITE_LABEL} orders must have product associations`);
    }

    if (rules.requiresVariantAssociation && context.orderItems) {
      const itemsWithoutVariants = context.orderItems.filter(item => !item.productVariantId);
      if (itemsWithoutVariants.length > 0) {
        errors.push(`${ORDER_TYPE_NAMES.WHITE_LABEL} orders must have product variant associations for all items`);
      }
    }
  }

  // Rule 2: Private Label orders cannot have product associations
  if (context.orderType.name === ORDER_TYPE_NAMES.PRIVATE_LABEL) {
    if (context.orderItems && context.orderItems.some(item => item.productVariantId)) {
      errors.push(`${ORDER_TYPE_NAMES.PRIVATE_LABEL} orders cannot have product associations`);
    }
  }

  // Rule 3: Fabric orders can have products but not variants
  if (context.orderType.name === ORDER_TYPE_NAMES.FABRIC) {
    if (context.orderItems && context.orderItems.some(item => item.productVariantId)) {
      errors.push(`${ORDER_TYPE_NAMES.FABRIC} orders cannot have product variant associations`);
    }
  }

  // Rule 4: Single product constraint per order (business logic enforcement)
  if (context.orderItems && context.orderItems.length > 1) {
    // Check if multiple different products are referenced
    const uniqueProducts = new Set(
      context.orderItems
        .filter(item => item.productVariantId)
        .map(item => item.productVariantId)
    );

    if (uniqueProducts.size > 1) {
      warnings.push('Orders typically contain items from a single product type for consistency');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates that an order type supports variable products
 */
export function validateVariableProductSupport(orderType: OrderType, isVariable: boolean): BusinessRuleValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (isVariable && !orderType.supportsVariableProducts) {
    errors.push(
      `Order type '${orderType.name}' does not support variable products. Variable products can only be created for order types with variable product support enabled.`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates order type compatibility with product associations
 */
export function validateOrderTypeProductSupport(orderType: OrderType, hasProducts: boolean): BusinessRuleValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const rules = getOrderTypeRules(orderType);

  if (hasProducts && !rules.allowsProductAssociation) {
    errors.push(
      `Order type '${orderType.name}' does not support product associations`
    );
  }

  if (!hasProducts && rules.requiresProductAssociation) {
    errors.push(
      `Order type '${orderType.name}' requires product associations`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Gets a human-readable description of order type business rules
 */
export function getOrderTypeRulesDescription(orderType: OrderType): string {
  const rules = getOrderTypeRules(orderType);
  const descriptions: string[] = [];

  switch (orderType.name as OrderTypeName) {
    case ORDER_TYPE_NAMES.PRIVATE_LABEL:
      descriptions.push('Custom manufacturing without pre-defined products');
      descriptions.push('Cannot have product or variant associations');
      break;

    case ORDER_TYPE_NAMES.WHITE_LABEL:
      descriptions.push('Must use existing product variants');
      descriptions.push('Requires both product and variant associations');
      break;

    case ORDER_TYPE_NAMES.FABRIC:
      descriptions.push('Raw materials and simple products');
      descriptions.push('Can have products but not variants');
      break;

    default:
      if (rules.supportsProducts) {
        descriptions.push('Supports product associations');
      }
      if (rules.supportsVariableProducts) {
        descriptions.push('Supports variable products with variants');
      }
      break;
  }

  return descriptions.join('. ');
}
