// Order Business Rules Implementation
// HBM Service Layer - Order-specific Business Rules

import { Order, OrderItem, OrderType } from '@/types';
import { validateOrderForOrderType } from './order-type-rules';
import {
  BusinessRuleValidationResult,
  OrderValidationContext
} from './types';

/**
 * Validates all order business rules
 */
export function validateOrderBusinessRules(
  order: Order,
  orderType: OrderType,
  orderItems: OrderItem[] = [],
  isCreating: boolean = false
): BusinessRuleValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const context: OrderValidationContext = {
    order,
    orderType,
    orderItems,
    isCreating,
    isUpdating: !isCreating,
  };

  // Rule 1: Order type compatibility validation
  const orderTypeValidation = validateOrderForOrderType(context);
  errors.push(...orderTypeValidation.errors);
  warnings.push(...orderTypeValidation.warnings);

  // Rule 2: Order items validation
  const orderItemsValidation = validateOrderItemsBusinessRules(orderItems, orderType);
  errors.push(...orderItemsValidation.errors);
  warnings.push(...orderItemsValidation.warnings);

  // Rule 3: Single product constraint validation
  const singleProductValidation = validateSingleProductConstraint(orderItems);
  errors.push(...singleProductValidation.errors);
  warnings.push(...singleProductValidation.warnings);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates order items business rules
 */
export function validateOrderItemsBusinessRules(
  orderItems: OrderItem[],
  orderType: OrderType
): BusinessRuleValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (orderItems.length === 0) {
    errors.push('Orders must have at least one item');
    return { isValid: false, errors, warnings };
  }

  orderItems.forEach((item, index) => {
    // Rule 1: Positive quantity validation (enforced at database level)
    if (item.quantity <= 0) {
      errors.push(`Order item ${index + 1}: Quantity must be positive`);
    }

    // Rule 2: Item name validation
    if (!item.itemName || item.itemName.trim() === '') {
      errors.push(`Order item ${index + 1}: Item name is required`);
    }

    // Rule 3: Order type specific validations
    switch (orderType.name) {
      case 'Private Label':
        // Private Label: Should not have product variant associations
        if (item.productVariantId) {
          errors.push(
            `Order item ${index + 1}: Private Label orders cannot have product variant associations`
          );
        }
        break;

      case 'White Label':
        // White Label: Must have product variant associations
        if (!item.productVariantId) {
          errors.push(
            `Order item ${index + 1}: White Label orders must have product variant associations`
          );
        }
        break;

      case 'Fabric':
        // Fabric: Should not have product variant associations
        if (item.productVariantId) {
          errors.push(
            `Order item ${index + 1}: Fabric orders cannot have product variant associations`
          );
        }
        break;
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates single product constraint per order
 */
export function validateSingleProductConstraint(orderItems: OrderItem[]): BusinessRuleValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (orderItems.length <= 1) {
    return { isValid: true, errors, warnings };
  }

  // Extract product information from order items
  const productReferences = orderItems
    .filter(item => item.productVariantId)
    .map(item => item.productVariantId);

  // Check for multiple different products
  if (productReferences.length > 0) {
    const uniqueProducts = new Set(productReferences);

    if (uniqueProducts.size > 1) {
      warnings.push(
        'Order contains items from multiple different products. Consider splitting into separate orders for better tracking and fulfillment.'
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates order creation business rules
 */
export function validateOrderCreationBusinessRules(
  orderData: {
    customerId: string;
    orderTypeId?: string;
    items: Array<{
      productVariantId?: string;
      itemName: string;
      quantity: number;
    }>;
  },
  orderType: OrderType
): BusinessRuleValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Rule 1: Customer ID validation
  if (!orderData.customerId) {
    errors.push('Customer ID is required for order creation');
  }

  // Rule 2: Order type validation
  if (!orderData.orderTypeId) {
    warnings.push('Order type not specified. Default behavior will be applied.');
  }

  // Rule 3: Items validation
  if (!orderData.items || orderData.items.length === 0) {
    errors.push('Order must have at least one item');
  }

  // Rule 4: Order type specific creation rules
  if (orderData.items) {
    const mockOrderItems: OrderItem[] = orderData.items.map((item, index) => ({
      id: `temp-${index}`,
      orderId: 'temp-order',
      productVariantId: item.productVariantId,
      itemName: item.itemName,
      quantity: item.quantity,
      createdAt: new Date(),
    }));

    const itemsValidation = validateOrderItemsBusinessRules(mockOrderItems, orderType);
    errors.push(...itemsValidation.errors);
    warnings.push(...itemsValidation.warnings);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates order update business rules
 */
export function validateOrderUpdateBusinessRules(
  currentOrder: Order,
  updateData: Partial<Order>,
  orderType: OrderType,
  newOrderItems?: OrderItem[]
): BusinessRuleValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Rule 1: Order type change validation
  if (updateData.orderTypeId && updateData.orderTypeId !== currentOrder.orderTypeId) {
    warnings.push(
      'Changing order type may affect existing business rules and item associations. Verify compatibility.'
    );
  }

  // Rule 2: Status-dependent update restrictions
  if (currentOrder.confirmedAt && updateData.orderTypeId) {
    warnings.push(
      'Changing order type for confirmed orders may impact production. Consider creating a new order instead.'
    );
  }

  if (currentOrder.productionStartedAt && (updateData.orderTypeId || newOrderItems)) {
    errors.push(
      'Cannot modify order type or items for orders that have started production'
    );
  }

  // Rule 3: New order items validation
  if (newOrderItems) {
    const itemsValidation = validateOrderItemsBusinessRules(newOrderItems, orderType);
    errors.push(...itemsValidation.errors);
    warnings.push(...itemsValidation.warnings);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates order deletion business rules
 */
export function validateOrderDeletionBusinessRules(order: Order): BusinessRuleValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Rule 1: Cannot delete confirmed orders
  if (order.confirmedAt) {
    errors.push('Cannot delete confirmed orders. Consider canceling instead.');
  }

  // Rule 2: Cannot delete orders in production
  if (order.productionStartedAt) {
    errors.push('Cannot delete orders that have started production');
  }

  // Rule 3: Cannot delete completed orders
  if (order.completedAt) {
    errors.push('Cannot delete completed orders');
  }

  // Rule 4: Warning for orders with quotations
  if (order.quotations && order.quotations.length > 0) {
    warnings.push(
      'This order has associated quotations. Deletion will also remove quotation data.'
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
