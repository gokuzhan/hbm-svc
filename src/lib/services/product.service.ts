// Product Service with Variant and Category Management

import { ACTIONS, RESOURCES } from '@/constants';
import {
  BusinessRuleValidationError,
  validateProductBusinessRules,
  validateProductDeletionBusinessRules,
  validateProductSKUBusinessRules,
  validateProductUpdateBusinessRules,
  validateProductVariantBusinessRules,
} from '@/lib/business-rules';
import { PaginatedResult, QueryOptions } from '@/lib/dal/base';
import { ProductRepository } from '@/lib/repositories/product.repository';
import { OrderType, Product, ProductVariant } from '@/types';
import { BaseServiceWithAuth } from './base.service';
import { PermissionResult, ServiceContext, ServiceError, ValidationError } from './types';

export interface CreateProductData {
  name: string;
  description?: string;
  sku?: string;
  orderTypeId: string;
  isVariable: boolean;
  isActive?: boolean;
}

export interface UpdateProductData {
  name?: string;
  description?: string;
  sku?: string;
  orderTypeId?: string;
  isVariable?: boolean;
  isActive?: boolean;
}

export interface CreateProductVariantData {
  productId: string;
  name: string;
  variantIdentifier: string;
  isActive?: boolean;
}

export interface UpdateProductVariantData {
  name?: string;
  variantIdentifier?: string;
  isActive?: boolean;
}

export class ProductService extends BaseServiceWithAuth<Product> {
  private productRepository: ProductRepository;

  constructor() {
    const productRepository = new ProductRepository();
    super(productRepository, RESOURCES.PRODUCTS);
    this.productRepository = productRepository;
  }

  /**
   * Override customer permission checking
   * Customers can only read products (for catalog browsing)
   */
  protected checkCustomerPermission(context: ServiceContext, action: string): PermissionResult {
    // Customers can only read products
    if (action === ACTIONS.READ) {
      return { allowed: true };
    }

    // Customers cannot create, update, or delete products
    return {
      allowed: false,
      reason: `Customers cannot perform ${action} operations on products`,
    };
  }

  /**
   * Create a new product (staff only)
   */
  async createProduct(context: ServiceContext, productData: CreateProductData): Promise<Product> {
    await this.requirePermission(context, ACTIONS.CREATE);

    // Only staff can create products
    if (context.userType === 'customer') {
      throw new ValidationError('Customers cannot create products');
    }

    // Validate product data
    await this.validateProductData(productData);

    // Check if SKU already exists (if provided)
    if (productData.sku) {
      const existingProduct = await this.productRepository.findBySku(productData.sku);
      if (existingProduct) {
        throw new ValidationError('SKU already exists');
      }
    }

    // Get order type for business rule validation
    const orderType = await this.getOrderTypeById(productData.orderTypeId);
    if (!orderType) {
      throw new ValidationError('Order type not found');
    }

    // Create product object for validation
    const productForValidation = {
      id: 'temp-id', // Temporary ID for validation
      name: productData.name,
      description: productData.description,
      sku: productData.sku,
      orderTypeId: productData.orderTypeId,
      isVariable: productData.isVariable,
      isActive: productData.isActive ?? true,
      createdBy: context.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      orderType,
    };

    // Validate business rules
    const businessRuleValidation = validateProductBusinessRules(productForValidation, orderType, true);
    if (!businessRuleValidation.isValid) {
      throw new BusinessRuleValidationError(
        businessRuleValidation.errors,
        businessRuleValidation.warnings,
        { productName: productData.name, orderTypeName: orderType.name }
      );
    }

    // Validate SKU business rules
    const skuValidation = validateProductSKUBusinessRules(productData.sku);
    if (!skuValidation.isValid) {
      throw new BusinessRuleValidationError(
        skuValidation.errors,
        skuValidation.warnings,
        { sku: productData.sku }
      );
    }

    const productToCreate = {
      ...productData,
      isActive: productData.isActive ?? true,
      createdBy: context.userId,
    };

    this.logServiceOperation('createProduct', context, { name: productData.name });

    try {
      const product = await this.productRepository.create(productToCreate);
      this.logServiceOperation('createProduct.success', context, { productId: product.id });
      return product;
    } catch (error) {
      this.logServiceOperation('createProduct.error', context, { name: productData.name, error });
      throw new ServiceError(`Failed to create product: ${(error as Error).message}`);
    }
  }

  /**
   * Update product information (staff only)
   */
  async updateProduct(
    context: ServiceContext,
    productId: string,
    productData: UpdateProductData
  ): Promise<Product | null> {
    await this.requirePermission(context, ACTIONS.UPDATE);

    // Only staff can update products
    if (context.userType === 'customer') {
      throw new ValidationError('Customers cannot update products');
    }

    // Check if product exists
    const existingProduct = await this.productRepository.findById(productId);
    if (!existingProduct) {
      throw new ValidationError('Product not found');
    }

    // Get order type for business rule validation (current or new)
    const orderTypeId = productData.orderTypeId || existingProduct.orderTypeId;
    const orderType = await this.getOrderTypeById(orderTypeId);
    if (!orderType) {
      throw new ValidationError('Order type not found');
    }

    // Check if product has variants for business rule validation
    const variants = await this.productRepository.getProductVariants(productId);
    const hasVariants = variants.length > 0;

    // Validate business rules for the update
    const businessRuleValidation = validateProductUpdateBusinessRules(
      existingProduct,
      productData,
      orderType,
      hasVariants
    );
    if (!businessRuleValidation.isValid) {
      throw new BusinessRuleValidationError(
        businessRuleValidation.errors,
        businessRuleValidation.warnings,
        { productId, existingProductName: existingProduct.name, orderTypeName: orderType.name }
      );
    }

    // Validate SKU if being changed
    if (productData.sku && productData.sku !== existingProduct.sku) {
      const skuValidation = validateProductSKUBusinessRules(productData.sku);
      if (!skuValidation.isValid) {
        throw new BusinessRuleValidationError(
          skuValidation.errors,
          skuValidation.warnings,
          { sku: productData.sku, productId }
        );
      }

      const skuExists = await this.productRepository.findBySku(productData.sku);
      if (skuExists) {
        throw new ValidationError('SKU already exists');
      }
    }

    this.logServiceOperation('updateProduct', context, {
      productId,
      updates: Object.keys(productData),
    });

    try {
      const updatedProduct = await this.productRepository.update(productId, productData);
      this.logServiceOperation('updateProduct.success', context, { productId });
      return updatedProduct;
    } catch (error) {
      this.logServiceOperation('updateProduct.error', context, { productId, error });
      throw new ServiceError(`Failed to update product: ${(error as Error).message}`);
    }
  }

  /**
   * Toggle product active status (staff only)
   */
  async toggleProductStatus(
    context: ServiceContext,
    productId: string,
    isActive: boolean
  ): Promise<Product | null> {
    await this.requirePermission(context, ACTIONS.UPDATE);

    // Only staff can change product status
    if (context.userType === 'customer') {
      throw new ValidationError('Customers cannot change product status');
    }

    const product = await this.productRepository.findById(productId);
    if (!product) {
      throw new ValidationError('Product not found');
    }

    this.logServiceOperation('toggleProductStatus', context, { productId, isActive });

    try {
      const updatedProduct = await this.productRepository.update(productId, { isActive });
      this.logServiceOperation('toggleProductStatus.success', context, { productId, isActive });
      return updatedProduct;
    } catch (error) {
      this.logServiceOperation('toggleProductStatus.error', context, { productId, error });
      throw new ServiceError(`Failed to update product status: ${(error as Error).message}`);
    }
  }

  /**
   * Find product by SKU
   */
  async findBySku(context: ServiceContext, sku: string): Promise<Product | null> {
    await this.requirePermission(context, ACTIONS.READ);

    this.logServiceOperation('findBySku', context, { sku });

    try {
      return await this.productRepository.findBySku(sku);
    } catch (error) {
      this.logServiceOperation('findBySku.error', context, { sku, error });
      throw new ServiceError(`Failed to find product by SKU: ${(error as Error).message}`);
    }
  }

  /**
   * Get products by order type
   */
  async getProductsByOrderType(
    context: ServiceContext,
    orderTypeId: string,
    options?: QueryOptions
  ): Promise<PaginatedResult<Product>> {
    await this.requirePermission(context, ACTIONS.READ);

    this.logServiceOperation('getProductsByOrderType', context, { orderTypeId });

    try {
      const queryOptions = {
        ...options,
        filters: {
          ...options?.filters,
          orderTypeId,
          isActive: true, // Only show active products to customers
        },
      };
      return await this.productRepository.findAll(queryOptions);
    } catch (error) {
      this.logServiceOperation('getProductsByOrderType.error', context, { orderTypeId, error });
      throw new ServiceError(`Failed to get products by order type: ${(error as Error).message}`);
    }
  }

  /**
   * Get variable products (products with variants)
   */
  async getVariableProducts(
    context: ServiceContext,
    options?: QueryOptions
  ): Promise<PaginatedResult<Product>> {
    await this.requirePermission(context, ACTIONS.READ);

    this.logServiceOperation('getVariableProducts', context);

    try {
      const queryOptions = {
        ...options,
        filters: {
          ...options?.filters,
          isVariable: true,
          isActive: true,
        },
      };
      return await this.productRepository.findAll(queryOptions);
    } catch (error) {
      this.logServiceOperation('getVariableProducts.error', context, { error });
      throw new ServiceError(`Failed to get variable products: ${(error as Error).message}`);
    }
  }

  /**
   * Create product variant (staff only)
   * Note: This would need to be implemented in the repository layer
   */
  async createProductVariant(
    context: ServiceContext,
    variantData: CreateProductVariantData
  ): Promise<ProductVariant> {
    await this.requirePermission(context, ACTIONS.CREATE);

    // Only staff can create variants
    if (context.userType === 'customer') {
      throw new ValidationError('Customers cannot create product variants');
    }

    // Check if product exists and is variable
    const product = await this.productRepository.findById(variantData.productId);
    if (!product) {
      throw new ValidationError('Product not found');
    }

    // Get order type for business rule validation
    const orderType = await this.getOrderTypeById(product.orderTypeId);
    if (!orderType) {
      throw new ValidationError('Order type not found');
    }

    // Create variant object for validation
    const variantForValidation = {
      id: 'temp-id', // Temporary ID for validation
      productId: variantData.productId,
      name: variantData.name,
      variantIdentifier: variantData.variantIdentifier,
      isActive: variantData.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
      product,
    };

    // Validate business rules for variant creation
    const businessRuleValidation = validateProductVariantBusinessRules(
      variantForValidation,
      product,
      orderType
    );

    if (!businessRuleValidation.isValid) {
      throw new BusinessRuleValidationError(
        businessRuleValidation.errors,
        businessRuleValidation.warnings,
        {
          productId: variantData.productId,
          variantName: variantData.name,
          orderTypeName: orderType.name
        }
      );
    }

    // For now, throw an error indicating this feature needs repository implementation
    throw new ServiceError('Product variant creation not yet implemented in repository layer');
  }

  /**
   * Update product variant (staff only)
   * Note: This would need to be implemented in the repository layer
   */
  async updateProductVariant(
    context: ServiceContext,
    variantId: string,
    variantData: UpdateProductVariantData
  ): Promise<ProductVariant | null> {
    await this.requirePermission(context, ACTIONS.UPDATE);

    // Only staff can update variants
    if (context.userType === 'customer') {
      throw new ValidationError('Customers cannot update product variants');
    }

    // For now, throw an error indicating this feature needs repository implementation
    // TODO: Implement with variantId and variantData when repository layer is ready
    console.log('Update variant:', variantId, variantData); // Placeholder to avoid unused variable warning
    throw new ServiceError('Product variant update not yet implemented in repository layer');
  }

  /**
   * Get product variants
   */
  async getProductVariants(context: ServiceContext, productId: string): Promise<ProductVariant[]> {
    await this.requirePermission(context, ACTIONS.READ);

    const product = await this.productRepository.findById(productId);
    if (!product) {
      throw new ValidationError('Product not found');
    }

    this.logServiceOperation('getProductVariants', context, { productId });

    try {
      return await this.productRepository.getProductVariants(productId);
    } catch (error) {
      this.logServiceOperation('getProductVariants.error', context, { productId, error });
      throw new ServiceError(`Failed to get product variants: ${(error as Error).message}`);
    }
  }

  // Protected methods implementation
  protected async validateCreate(
    context: ServiceContext,
    data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<void> {
    if (!data.name || !data.orderTypeId) {
      throw new ValidationError('Product name and order type are required');
    }
  }

  protected async validateUpdate(
    context: ServiceContext,
    id: string,
    data: Partial<Product>
  ): Promise<void> {
    // Additional validation for product updates
    // TODO: Implement validation logic using context, id, and data
    console.log('Validate update:', context, id, data); // Placeholder to avoid unused variable warning
  }

  protected async validateDelete(context: ServiceContext, id: string): Promise<void> {
    // Check if product has any dependent records (order items, variants)
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new ValidationError('Product not found');
    }

    // Check for variants
    const variants = await this.productRepository.getProductVariants(id);
    const hasVariants = variants.length > 0;

    // Validate business rules for deletion
    const businessRuleValidation = validateProductDeletionBusinessRules(
      product,
      hasVariants,
      false // TODO: Add check for order items when order item repository method is available
    );

    if (!businessRuleValidation.isValid) {
      throw new BusinessRuleValidationError(
        businessRuleValidation.errors,
        businessRuleValidation.warnings,
        { productId: id, productName: product.name }
      );
    }

    // Log warnings if any
    if (businessRuleValidation.warnings.length > 0) {
      this.logServiceOperation('validateDelete.warnings', context, {
        productId: id,
        warnings: businessRuleValidation.warnings,
      });
    }
  }

  protected async checkCustomerAccess(context: ServiceContext, entity: Product): Promise<boolean> {
    // Customers can only view active products
    if (context.userType === 'customer') {
      return entity.isActive;
    }
    // Staff can access all products
    return true;
  }

  protected async applyCustomerFilters(
    context: ServiceContext,
    options?: QueryOptions
  ): Promise<QueryOptions | undefined> {
    if (context.userType === 'customer') {
      // Customers can only see active products
      return {
        ...options,
        filters: {
          ...options?.filters,
          isActive: true,
        },
      };
    }
    return options;
  }

  // Private validation methods
  private async validateProductData(productData: CreateProductData): Promise<void> {
    if (!productData.name || productData.name.trim().length === 0) {
      throw new ValidationError('Product name is required');
    }

    if (!productData.orderTypeId) {
      throw new ValidationError('Order type is required');
    }

    if (productData.sku && productData.sku.trim().length === 0) {
      throw new ValidationError('SKU cannot be empty if provided');
    }
  }

  private async validateVariantData(variantData: CreateProductVariantData): Promise<void> {
    if (!variantData.name || variantData.name.trim().length === 0) {
      throw new ValidationError('Variant name is required');
    }

    if (!variantData.variantIdentifier || variantData.variantIdentifier.trim().length === 0) {
      throw new ValidationError('Variant identifier is required');
    }
  }

  /**
   * Helper method to get order type by ID
   */
  private async getOrderTypeById(orderTypeId: string): Promise<OrderType | null> {
    try {
      const result = await this.productRepository.getOrderTypeById(orderTypeId);
      if (!result) {
        return null;
      }

      // Ensure createdAt is a Date object
      return {
        ...result,
        createdAt: result.createdAt || new Date(),
      };
    } catch (error) {
      this.logServiceOperation('getOrderTypeById.error', { userId: 'system', userType: 'staff', permissions: [] }, { orderTypeId, error });
      return null;
    }
  }
}
