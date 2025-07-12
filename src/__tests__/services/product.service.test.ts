import { ACTIONS, RESOURCES } from '@/constants';
import { BusinessRuleValidationError } from '@/lib/business-rules/errors';
import { ProductRepository } from '@/lib/repositories/product.repository';
import {
  CreateProductData,
  ProductService,
  UpdateProductData,
} from '@/lib/services/product.service';
import {
  PermissionError,
  PermissionResult,
  ServiceContext,
  ServiceError,
  ServiceQueryOptions,
  ValidationError,
} from '@/lib/services/types';
import { Product, ProductVariant } from '@/types';

// Mock the ProductRepository
jest.mock('@/lib/repositories/product.repository');

const MockedProductRepository = ProductRepository as jest.MockedClass<typeof ProductRepository>;

describe('ProductService', () => {
  let productService: ProductService;
  let mockProductRepository: jest.Mocked<ProductRepository>;

  const mockStaffContext: ServiceContext = {
    userId: 'staff-1',
    userType: 'staff',
    permissions: [
      `${RESOURCES.PRODUCTS}:${ACTIONS.CREATE}`,
      `${RESOURCES.PRODUCTS}:${ACTIONS.READ}`,
      `${RESOURCES.PRODUCTS}:${ACTIONS.UPDATE}`,
      `${RESOURCES.PRODUCTS}:${ACTIONS.DELETE}`,
    ],
  };

  const mockCustomerContext: ServiceContext = {
    userId: 'customer-1',
    userType: 'customer',
    permissions: [`${RESOURCES.PRODUCTS}:${ACTIONS.READ}`],
  };

  const mockProduct: Product = {
    id: 'product-1',
    name: 'Test Product',
    description: 'Test product description',
    sku: 'TEST-001',
    orderTypeId: 'order-type-1',
    isVariable: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'staff-1',
  };

  const mockVariableProduct: Product = {
    id: 'product-2',
    name: 'Variable Product',
    description: 'Variable product description',
    sku: 'VAR-001',
    orderTypeId: 'order-type-1',
    isVariable: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'staff-1',
  };

  const mockProductVariant: ProductVariant = {
    id: 'variant-1',
    productId: 'product-2',
    name: 'Small Size',
    variantIdentifier: 'SIZE-S',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOrderType = {
    id: 'order-type-1',
    name: 'White Label',
    description: 'White Label order type',
    isActive: true,
    supportsProducts: true,
    supportsVariableProducts: true,
    createdAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockProductRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findBySku: jest.fn(),
      getProductVariants: jest.fn(),
      findByOrderType: jest.fn(),
      findVariableProducts: jest.fn(),
      getOrderTypeById: jest.fn(),
      logOperation: jest.fn(),
    } as unknown as jest.Mocked<ProductRepository>;

    MockedProductRepository.mockImplementation(() => mockProductRepository);
    productService = new ProductService();
  });

  describe('createProduct', () => {
    const validProductData: CreateProductData = {
      name: 'New Product',
      description: 'New product description',
      sku: 'NEW-001',
      orderTypeId: 'order-type-1',
      isVariable: false,
      isActive: true,
    };

    it('should create product successfully for staff', async () => {
      mockProductRepository.findBySku.mockResolvedValue(null);
      mockProductRepository.getOrderTypeById.mockResolvedValue(mockOrderType);
      mockProductRepository.create.mockResolvedValue(mockProduct);

      const result = await productService.createProduct(mockStaffContext, validProductData);

      expect(result).toEqual(mockProduct);
      expect(mockProductRepository.findBySku).toHaveBeenCalledWith('NEW-001');
      expect(mockProductRepository.getOrderTypeById).toHaveBeenCalledWith('order-type-1');
      expect(mockProductRepository.create).toHaveBeenCalledWith({
        ...validProductData,
        isActive: true,
        createdBy: 'staff-1',
      });
    });

    it('should throw error if customer tries to create product', async () => {
      await expect(
        productService.createProduct(mockCustomerContext, validProductData)
      ).rejects.toThrow(PermissionError);

      expect(mockProductRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error if SKU already exists', async () => {
      mockProductRepository.findBySku.mockResolvedValue(mockProduct);

      await expect(
        productService.createProduct(mockStaffContext, validProductData)
      ).rejects.toThrow(ValidationError);

      expect(mockProductRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error if product name is missing', async () => {
      const invalidData = { ...validProductData, name: '' };

      await expect(productService.createProduct(mockStaffContext, invalidData)).rejects.toThrow(
        ValidationError
      );

      expect(mockProductRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error if order type is missing', async () => {
      const invalidData = { ...validProductData, orderTypeId: '' };

      await expect(productService.createProduct(mockStaffContext, invalidData)).rejects.toThrow(
        ValidationError
      );

      expect(mockProductRepository.create).not.toHaveBeenCalled();
    });

    it('should handle repository errors', async () => {
      mockProductRepository.findBySku.mockResolvedValue(null);
      mockProductRepository.getOrderTypeById.mockResolvedValue(mockOrderType);
      mockProductRepository.create.mockRejectedValue(new Error('Database error'));

      await expect(
        productService.createProduct(mockStaffContext, validProductData)
      ).rejects.toThrow(ServiceError);
    });
  });

  describe('updateProduct', () => {
    const updateData: UpdateProductData = {
      name: 'Updated Product',
      description: 'Updated description',
    };

    it('should update product successfully for staff', async () => {
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockProductRepository.getOrderTypeById.mockResolvedValue(mockOrderType);
      mockProductRepository.getProductVariants.mockResolvedValue([]);
      mockProductRepository.update.mockResolvedValue({ ...mockProduct, ...updateData });

      const result = await productService.updateProduct(mockStaffContext, 'product-1', updateData);

      expect(result).toEqual({ ...mockProduct, ...updateData });
      expect(mockProductRepository.findById).toHaveBeenCalledWith('product-1');
      expect(mockProductRepository.update).toHaveBeenCalledWith('product-1', updateData);
    });

    it('should throw error if customer tries to update product', async () => {
      await expect(
        productService.updateProduct(mockCustomerContext, 'product-1', updateData)
      ).rejects.toThrow(PermissionError);

      expect(mockProductRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error if product not found', async () => {
      mockProductRepository.findById.mockResolvedValue(null);

      await expect(
        productService.updateProduct(mockStaffContext, 'non-existent', updateData)
      ).rejects.toThrow(ValidationError);

      expect(mockProductRepository.update).not.toHaveBeenCalled();
    });

    it('should validate SKU uniqueness when updating', async () => {
      const existingProduct = { ...mockProduct, sku: 'EXISTING-001' };
      const anotherProduct = { ...mockProduct, id: 'product-2', sku: 'ANOTHER-001' };

      mockProductRepository.findById.mockResolvedValue(existingProduct);
      mockProductRepository.findBySku.mockResolvedValue(anotherProduct);
      mockProductRepository.getOrderTypeById.mockResolvedValue(mockOrderType);
      mockProductRepository.getProductVariants.mockResolvedValue([]);

      const updateWithSku = { ...updateData, sku: 'ANOTHER-001' };

      await expect(
        productService.updateProduct(mockStaffContext, 'product-1', updateWithSku)
      ).rejects.toThrow(ValidationError);

      expect(mockProductRepository.update).not.toHaveBeenCalled();
    });

    it('should allow updating with same SKU', async () => {
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockProductRepository.update.mockResolvedValue({ ...mockProduct, ...updateData });
      mockProductRepository.getOrderTypeById.mockResolvedValue(mockOrderType);
      mockProductRepository.getProductVariants.mockResolvedValue([]);

      const updateWithSameSku = { ...updateData, sku: mockProduct.sku };

      const result = await productService.updateProduct(
        mockStaffContext,
        'product-1',
        updateWithSameSku
      );

      expect(result).toEqual({ ...mockProduct, ...updateData });
      expect(mockProductRepository.update).toHaveBeenCalledWith('product-1', updateWithSameSku);
    });
  });

  describe('toggleProductStatus', () => {
    it('should toggle product status successfully for staff', async () => {
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockProductRepository.update.mockResolvedValue({ ...mockProduct, isActive: false });

      const result = await productService.toggleProductStatus(mockStaffContext, 'product-1', false);

      expect(result).toEqual({ ...mockProduct, isActive: false });
      expect(mockProductRepository.update).toHaveBeenCalledWith('product-1', { isActive: false });
    });

    it('should throw error if customer tries to toggle status', async () => {
      await expect(
        productService.toggleProductStatus(mockCustomerContext, 'product-1', false)
      ).rejects.toThrow(PermissionError);

      expect(mockProductRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error if product not found', async () => {
      mockProductRepository.findById.mockResolvedValue(null);

      await expect(
        productService.toggleProductStatus(mockStaffContext, 'non-existent', false)
      ).rejects.toThrow(ValidationError);

      expect(mockProductRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('findBySku', () => {
    it('should find product by SKU successfully', async () => {
      mockProductRepository.findBySku.mockResolvedValue(mockProduct);

      const result = await productService.findBySku(mockStaffContext, 'TEST-001');

      expect(result).toEqual(mockProduct);
      expect(mockProductRepository.findBySku).toHaveBeenCalledWith('TEST-001');
    });

    it('should return null if product not found', async () => {
      mockProductRepository.findBySku.mockResolvedValue(null);

      const result = await productService.findBySku(mockStaffContext, 'NON-EXISTENT');

      expect(result).toBeNull();
    });

    it('should handle repository errors', async () => {
      mockProductRepository.findBySku.mockRejectedValue(new Error('Database error'));

      await expect(productService.findBySku(mockStaffContext, 'TEST-001')).rejects.toThrow(
        ServiceError
      );
    });
  });

  describe('getProductsByOrderType', () => {
    it('should get products by order type', async () => {
      const mockResult = {
        data: [mockProduct],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          pages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      mockProductRepository.findAll.mockResolvedValue(mockResult);

      const result = await productService.getProductsByOrderType(mockStaffContext, 'order-type-1');

      expect(result).toEqual(mockResult);
      expect(mockProductRepository.findAll).toHaveBeenCalledWith({
        filters: {
          orderTypeId: 'order-type-1',
          isActive: true,
        },
      });
    });

    it('should work with additional options', async () => {
      const mockResult = {
        data: [mockProduct],
        pagination: {
          page: 1,
          limit: 5,
          total: 1,
          pages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      mockProductRepository.findAll.mockResolvedValue(mockResult);

      const options = { limit: 5, page: 1 };
      const result = await productService.getProductsByOrderType(
        mockStaffContext,
        'order-type-1',
        options
      );

      expect(result).toEqual(mockResult);
      expect(mockProductRepository.findAll).toHaveBeenCalledWith({
        limit: 5,
        page: 1,
        filters: {
          orderTypeId: 'order-type-1',
          isActive: true,
        },
      });
    });
  });

  describe('getVariableProducts', () => {
    it('should get variable products successfully', async () => {
      const mockResult = {
        data: [mockVariableProduct],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          pages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      mockProductRepository.findAll.mockResolvedValue(mockResult);

      const result = await productService.getVariableProducts(mockStaffContext);

      expect(result).toEqual(mockResult);
      expect(mockProductRepository.findAll).toHaveBeenCalledWith({
        filters: {
          isVariable: true,
          isActive: true,
        },
      });
    });
  });

  describe('createProductVariant', () => {
    const variantData = {
      productId: 'product-2',
      name: 'Large Size',
      variantIdentifier: 'SIZE-L',
      isActive: true,
    };

    it('should throw error for customer users', async () => {
      await expect(
        productService.createProductVariant(mockCustomerContext, variantData)
      ).rejects.toThrow(PermissionError);
    });

    it('should throw error if product not found', async () => {
      mockProductRepository.findById.mockResolvedValue(null);

      await expect(
        productService.createProductVariant(mockStaffContext, variantData)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw error if product is not variable', async () => {
      mockProductRepository.findById.mockResolvedValue(mockProduct); // non-variable product
      mockProductRepository.getOrderTypeById.mockResolvedValue(mockOrderType);
      mockProductRepository.getProductVariants.mockResolvedValue([]);

      await expect(
        productService.createProductVariant(mockStaffContext, variantData)
      ).rejects.toThrow(BusinessRuleValidationError);
    });

    it('should throw service error indicating feature not implemented', async () => {
      mockProductRepository.findById.mockResolvedValue(mockVariableProduct);
      mockProductRepository.getOrderTypeById.mockResolvedValue(mockOrderType);
      mockProductRepository.getProductVariants.mockResolvedValue([]);

      await expect(
        productService.createProductVariant(mockStaffContext, variantData)
      ).rejects.toThrow(ServiceError);
    });
  });

  describe('updateProductVariant', () => {
    const variantUpdateData = {
      name: 'Updated Size',
      variantIdentifier: 'SIZE-UPD',
    };

    it('should throw error for customer users', async () => {
      await expect(
        productService.updateProductVariant(mockCustomerContext, 'variant-1', variantUpdateData)
      ).rejects.toThrow(PermissionError);
    });

    it('should throw service error indicating feature not implemented', async () => {
      await expect(
        productService.updateProductVariant(mockStaffContext, 'variant-1', variantUpdateData)
      ).rejects.toThrow(ServiceError);
    });
  });

  describe('getProductVariants', () => {
    it('should get product variants successfully', async () => {
      mockProductRepository.findById.mockResolvedValue(mockVariableProduct);
      mockProductRepository.getProductVariants.mockResolvedValue([mockProductVariant]);

      const result = await productService.getProductVariants(mockStaffContext, 'product-2');

      expect(result).toEqual([mockProductVariant]);
      expect(mockProductRepository.findById).toHaveBeenCalledWith('product-2');
      expect(mockProductRepository.getProductVariants).toHaveBeenCalledWith('product-2');
    });

    it('should throw error if product not found', async () => {
      mockProductRepository.findById.mockResolvedValue(null);

      await expect(
        productService.getProductVariants(mockStaffContext, 'non-existent')
      ).rejects.toThrow(ValidationError);

      expect(mockProductRepository.getProductVariants).not.toHaveBeenCalled();
    });

    it('should handle repository errors', async () => {
      mockProductRepository.findById.mockResolvedValue(mockVariableProduct);
      mockProductRepository.getProductVariants.mockRejectedValue(new Error('Database error'));

      await expect(
        productService.getProductVariants(mockStaffContext, 'product-2')
      ).rejects.toThrow(ServiceError);
    });
  });

  describe('checkCustomerPermission', () => {
    it('should allow customers to read products', () => {
      const service = new ProductService();
      const result = (
        service as ProductService & {
          checkCustomerPermission: (context: ServiceContext, action: string) => PermissionResult;
        }
      ).checkCustomerPermission(mockCustomerContext, ACTIONS.READ);

      expect(result.allowed).toBe(true);
    });

    it('should deny customers from creating products', () => {
      const service = new ProductService();
      const result = (
        service as ProductService & {
          checkCustomerPermission: (context: ServiceContext, action: string) => PermissionResult;
        }
      ).checkCustomerPermission(mockCustomerContext, ACTIONS.CREATE);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Customers cannot perform');
    });

    it('should deny customers from updating products', () => {
      const service = new ProductService();
      const result = (
        service as ProductService & {
          checkCustomerPermission: (context: ServiceContext, action: string) => PermissionResult;
        }
      ).checkCustomerPermission(mockCustomerContext, ACTIONS.UPDATE);

      expect(result.allowed).toBe(false);
    });

    it('should deny customers from deleting products', () => {
      const service = new ProductService();
      const result = (
        service as ProductService & {
          checkCustomerPermission: (context: ServiceContext, action: string) => PermissionResult;
        }
      ).checkCustomerPermission(mockCustomerContext, ACTIONS.DELETE);

      expect(result.allowed).toBe(false);
    });
  });

  describe('checkCustomerAccess', () => {
    it('should allow customers to access active products', async () => {
      const service = new ProductService();
      const result = await (
        service as ProductService & {
          checkCustomerAccess: (context: ServiceContext, entity: Product) => Promise<boolean>;
        }
      ).checkCustomerAccess(mockCustomerContext, mockProduct);

      expect(result).toBe(true);
    });

    it('should deny customers access to inactive products', async () => {
      const inactiveProduct = { ...mockProduct, isActive: false };
      const service = new ProductService();
      const result = await (
        service as ProductService & {
          checkCustomerAccess: (context: ServiceContext, entity: Product) => Promise<boolean>;
        }
      ).checkCustomerAccess(mockCustomerContext, inactiveProduct);

      expect(result).toBe(false);
    });

    it('should allow staff to access all products', async () => {
      const inactiveProduct = { ...mockProduct, isActive: false };
      const service = new ProductService();
      const result = await (
        service as ProductService & {
          checkCustomerAccess: (context: ServiceContext, entity: Product) => Promise<boolean>;
        }
      ).checkCustomerAccess(mockStaffContext, inactiveProduct);

      expect(result).toBe(true);
    });
  });

  describe('applyCustomerFilters', () => {
    it('should add isActive filter for customers', async () => {
      const service = new ProductService();
      const options = { limit: 10 };
      const result = await (
        service as ProductService & {
          applyCustomerFilters: (
            context: ServiceContext,
            options: ServiceQueryOptions
          ) => Promise<ServiceQueryOptions>;
        }
      ).applyCustomerFilters(mockCustomerContext, options);

      expect(result).toEqual({
        limit: 10,
        filters: {
          isActive: true,
        },
      });
    });

    it('should preserve existing filters for customers', async () => {
      const service = new ProductService();
      const options = {
        limit: 10,
        filters: { orderTypeId: 'order-type-1' },
      };
      const result = await (
        service as ProductService & {
          applyCustomerFilters: (
            context: ServiceContext,
            options: ServiceQueryOptions
          ) => Promise<ServiceQueryOptions>;
        }
      ).applyCustomerFilters(mockCustomerContext, options);

      expect(result).toEqual({
        limit: 10,
        filters: {
          orderTypeId: 'order-type-1',
          isActive: true,
        },
      });
    });

    it('should not modify options for staff', async () => {
      const service = new ProductService();
      const options = { limit: 10 };
      const result = await (
        service as ProductService & {
          applyCustomerFilters: (
            context: ServiceContext,
            options: ServiceQueryOptions
          ) => Promise<ServiceQueryOptions>;
        }
      ).applyCustomerFilters(mockStaffContext, options);

      expect(result).toEqual(options);
    });
  });

  describe('validateDelete', () => {
    it('should throw error if product not found', async () => {
      mockProductRepository.findById.mockResolvedValue(null);

      const service = new ProductService();
      await expect(
        (
          service as ProductService & {
            validateDelete: (context: ServiceContext, id: string) => Promise<void>;
          }
        ).validateDelete(mockStaffContext, 'non-existent')
      ).rejects.toThrow(ValidationError);
    });

    it('should throw error if product has variants', async () => {
      mockProductRepository.findById.mockResolvedValue(mockVariableProduct);
      mockProductRepository.getProductVariants.mockResolvedValue([mockProductVariant]);

      const service = new ProductService();
      await expect(
        (
          service as ProductService & {
            validateDelete: (context: ServiceContext, id: string) => Promise<void>;
          }
        ).validateDelete(mockStaffContext, 'product-2')
      ).rejects.toThrow(BusinessRuleValidationError);
    });

    it('should allow deletion if product has no variants', async () => {
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockProductRepository.getProductVariants.mockResolvedValue([]);

      const service = new ProductService();
      await expect(
        (
          service as ProductService & {
            validateDelete: (context: ServiceContext, id: string) => Promise<void>;
          }
        ).validateDelete(mockStaffContext, 'product-1')
      ).resolves.not.toThrow();
    });
  });
});
