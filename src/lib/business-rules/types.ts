// Business Rule Types and Interfaces
// HBM Service Layer - Order Type Business Rules

import { Order, OrderItem, OrderType, Product } from '@/types';

export interface BusinessRuleValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface OrderTypeBusinessRules {
  name: string;
  supportsProducts: boolean;
  supportsVariableProducts: boolean;
  allowsProductAssociation: boolean;
  allowsVariantAssociation: boolean;
  requiresProductAssociation: boolean;
  requiresVariantAssociation: boolean;
}

export interface ProductValidationContext {
  product?: Product;
  orderType: OrderType;
  isCreating: boolean;
  isUpdating: boolean;
}

export interface OrderValidationContext {
  order?: Order;
  orderType: OrderType;
  orderItems?: OrderItem[];
  isCreating: boolean;
  isUpdating: boolean;
}

export interface ProductAttributeValidationContext {
  productId: string;
  attributeDefinitionId: string;
  attributeValue?: string;
  customValue?: string;
}

// Order Type Constants
export const ORDER_TYPE_NAMES = {
  PRIVATE_LABEL: 'Private Label',
  WHITE_LABEL: 'White Label',
  FABRIC: 'Fabric',
} as const;

export type OrderTypeName = (typeof ORDER_TYPE_NAMES)[keyof typeof ORDER_TYPE_NAMES];
