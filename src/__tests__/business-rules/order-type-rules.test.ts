import {
  getOrderTypeRules,
  validateOrderForOrderType,
  validateOrderTypeProductSupport,
  validateProductForOrderType,
  validateVariableProductSupport,
} from '@/lib/business-rules/order-type-rules';
import { OrderItem, OrderType, Product } from '@/types';

describe('Order Type Business Rules', () => {
  // Mock data
  const mockPrivateLabelOrderType: OrderType = {
    id: 'private-label',
    name: 'Private Label',
    description: 'Private Label order type',
    isActive: true,
    supportsProducts: false,
    supportsVariableProducts: false,
    createdAt: new Date(),
  };

  const mockWhiteLabelOrderType: OrderType = {
    id: 'white-label',
    name: 'White Label',
    description: 'White Label order type',
    isActive: true,
    supportsProducts: true,
    supportsVariableProducts: true,
    createdAt: new Date(),
  };

  const mockFabricOrderType: OrderType = {
    id: 'fabric',
    name: 'Fabric',
    description: 'Fabric order type',
    isActive: true,
    supportsProducts: true,
    supportsVariableProducts: false,
    createdAt: new Date(),
  };

  const mockSimpleProduct: Product = {
    id: 'simple-product',
    sku: 'SP001',
    name: 'Simple Product',
    description: 'A simple product',
    orderTypeId: 'private-label',
    isActive: true,
    isVariable: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockVariableProduct: Product = {
    id: 'variable-product',
    sku: 'VP001',
    name: 'Variable Product',
    description: 'A variable product',
    orderTypeId: 'white-label',
    isActive: true,
    isVariable: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('getOrderTypeRules', () => {
    it('should return rules for Private Label order type', () => {
      const rules = getOrderTypeRules(mockPrivateLabelOrderType);

      expect(rules.name).toBe('Private Label');
      expect(rules.supportsProducts).toBe(false);
      expect(rules.supportsVariableProducts).toBe(false);
      expect(rules.allowsProductAssociation).toBe(false);
      expect(rules.allowsVariantAssociation).toBe(false);
    });

    it('should return rules for White Label order type', () => {
      const rules = getOrderTypeRules(mockWhiteLabelOrderType);

      expect(rules.name).toBe('White Label');
      expect(rules.supportsProducts).toBe(true);
      expect(rules.supportsVariableProducts).toBe(true);
      expect(rules.allowsProductAssociation).toBe(true);
      expect(rules.allowsVariantAssociation).toBe(true);
    });

    it('should return rules for Fabric order type', () => {
      const rules = getOrderTypeRules(mockFabricOrderType);

      expect(rules.name).toBe('Fabric');
      expect(rules.supportsProducts).toBe(true);
      expect(rules.supportsVariableProducts).toBe(false);
      expect(rules.allowsProductAssociation).toBe(true);
      expect(rules.allowsVariantAssociation).toBe(false);
    });
  });

  describe('validateVariableProductSupport', () => {
    it('should allow variable products for White Label order type', () => {
      const result = validateVariableProductSupport(mockWhiteLabelOrderType, true);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject variable products for Private Label order type', () => {
      const result = validateVariableProductSupport(mockPrivateLabelOrderType, true);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('does not support variable products');
    });

    it('should allow simple products for Private Label order type', () => {
      const result = validateVariableProductSupport(mockPrivateLabelOrderType, false);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject variable products for Fabric order type', () => {
      const result = validateVariableProductSupport(mockFabricOrderType, true);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('does not support variable products');
    });
  });

  describe('validateOrderTypeProductSupport', () => {
    it('should allow products for White Label order type', () => {
      const result = validateOrderTypeProductSupport(mockWhiteLabelOrderType, true);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    }); it('should reject products for Private Label order type', () => {
      const result = validateOrderTypeProductSupport(mockPrivateLabelOrderType, true);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('does not support product associations');
    });

    it('should allow empty product list for Private Label order type', () => {
      const result = validateOrderTypeProductSupport(mockPrivateLabelOrderType, false);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow products for Fabric order type', () => {
      const result = validateOrderTypeProductSupport(mockFabricOrderType, true);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateProductForOrderType', () => {
    it('should validate simple product for White Label order type', () => {
      const context = {
        product: mockSimpleProduct,
        orderType: mockWhiteLabelOrderType,
        isCreating: true,
        isUpdating: false,
      };

      const result = validateProductForOrderType(context);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate variable product with variants for White Label order type', () => {
      const context = {
        product: mockVariableProduct,
        orderType: mockWhiteLabelOrderType,
        isCreating: true,
        isUpdating: false,
      };

      const result = validateProductForOrderType(context);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    }); it('should validate variable product for White Label order type', () => {
      const context = {
        product: mockVariableProduct,
        orderType: mockWhiteLabelOrderType,
        isCreating: true,
        isUpdating: false,
      };

      const result = validateProductForOrderType(context);

      // Variable products are supported by White Label, so this should pass
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject products for unsupported order types', () => {
      const context = {
        product: mockSimpleProduct,
        orderType: mockPrivateLabelOrderType,
        isCreating: true,
        isUpdating: false,
      };

      const result = validateProductForOrderType(context);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateOrderForOrderType', () => {
    const mockOrderItems: OrderItem[] = [
      {
        id: 'item-1',
        orderId: 'order-1',
        productVariantId: 'variant-1',
        itemName: 'Test Item',
        itemDescription: 'Test Description',
        quantity: 5,
        specifications: {},
        createdAt: new Date(),
      },
    ];

    it('should validate order with proper items for White Label order type', () => {
      const context = {
        orderType: mockWhiteLabelOrderType,
        orderItems: mockOrderItems,
        isCreating: true,
        isUpdating: false,
      };

      const result = validateOrderForOrderType(context);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate order without products for Private Label order type', () => {
      const context = {
        orderType: mockPrivateLabelOrderType,
        orderItems: [],
        isCreating: true,
        isUpdating: false,
      };

      const result = validateOrderForOrderType(context);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject order with products for Private Label order type', () => {
      const context = {
        orderType: mockPrivateLabelOrderType,
        orderItems: mockOrderItems,
        isCreating: true,
        isUpdating: false,
      };

      const result = validateOrderForOrderType(context);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid order type gracefully', () => {
      const invalidOrderType = {
        ...mockPrivateLabelOrderType,
        name: 'Invalid Type',
      };

      const rules = getOrderTypeRules(invalidOrderType);

      // Should use default values
      expect(rules.name).toBe('Invalid Type');
      expect(rules.supportsProducts).toBe(false);
      expect(rules.supportsVariableProducts).toBe(false);
    }); it('should validate simple product for valid order type', () => {
      const context = {
        product: mockVariableProduct,
        orderType: mockWhiteLabelOrderType,
        isCreating: true,
        isUpdating: false,
      };

      const result = validateProductForOrderType(context);

      // White Label supports variable products, so this should pass
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
