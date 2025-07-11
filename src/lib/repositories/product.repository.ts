import { BaseService, PaginatedResult, QueryOptions } from '@/lib/dal/base';
import { db } from '@/lib/db';
import { orderTypes, productMedias, products, productVariants } from '@/lib/db/schema';
import { Product, ProductVariant } from '@/types';
import { and, asc, count, desc, eq, like } from 'drizzle-orm';

export interface CreateProductData {
  name: string;
  description?: string;
  sku?: string;
  orderTypeId: string;
  isVariable?: boolean;
  isActive?: boolean;
  createdBy?: string;
}

export interface UpdateProductData {
  name?: string;
  description?: string;
  sku?: string;
  orderTypeId?: string;
  isVariable?: boolean;
  isActive?: boolean;
}

export class ProductRepository extends BaseService<Product> {
  constructor() {
    super('Product');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapDatabaseProductToProduct(dbProduct: any): Product {
    return {
      id: dbProduct.id,
      name: dbProduct.name,
      description: dbProduct.description || undefined,
      sku: dbProduct.sku || undefined,
      orderTypeId: dbProduct.orderTypeId,
      isVariable: dbProduct.isVariable ?? false,
      isActive: dbProduct.isActive ?? true,
      createdBy: dbProduct.createdBy || undefined,
      createdAt: dbProduct.createdAt,
      updatedAt: dbProduct.updatedAt,
      orderType: dbProduct.orderType
        ? {
            id: dbProduct.orderType.id,
            name: dbProduct.orderType.name,
            description: dbProduct.orderType.description || undefined,
            isActive: dbProduct.orderType.isActive ?? true,
            supportsProducts: dbProduct.orderType.supportsProducts ?? true,
            supportsVariableProducts: dbProduct.orderType.supportsVariableProducts ?? false,
            createdAt: dbProduct.orderType.createdAt,
          }
        : undefined,
    };
  }

  async findById(id: string): Promise<Product | null> {
    this.logOperation('findById', { id });

    try {
      const result = await db
        .select({
          id: products.id,
          name: products.name,
          description: products.description,
          sku: products.sku,
          orderTypeId: products.orderTypeId,
          isVariable: products.isVariable,
          isActive: products.isActive,
          createdBy: products.createdBy,
          createdAt: products.createdAt,
          updatedAt: products.updatedAt,
          orderType: {
            id: orderTypes.id,
            name: orderTypes.name,
            description: orderTypes.description,
            isActive: orderTypes.isActive,
            supportsProducts: orderTypes.supportsProducts,
            supportsVariableProducts: orderTypes.supportsVariableProducts,
            createdAt: orderTypes.createdAt,
          },
        })
        .from(products)
        .leftJoin(orderTypes, eq(products.orderTypeId, orderTypes.id))
        .where(eq(products.id, id))
        .limit(1);

      return result[0] ? this.mapDatabaseProductToProduct(result[0]) : null;
    } catch (error) {
      this.logError('findById', error, { id });
      throw error;
    }
  }

  async findBySku(sku: string): Promise<Product | null> {
    this.logOperation('findBySku', { sku });

    try {
      const result = await db
        .select({
          id: products.id,
          name: products.name,
          description: products.description,
          sku: products.sku,
          orderTypeId: products.orderTypeId,
          isVariable: products.isVariable,
          isActive: products.isActive,
          createdBy: products.createdBy,
          createdAt: products.createdAt,
          updatedAt: products.updatedAt,
          orderType: {
            id: orderTypes.id,
            name: orderTypes.name,
            description: orderTypes.description,
            isActive: orderTypes.isActive,
            supportsProducts: orderTypes.supportsProducts,
            supportsVariableProducts: orderTypes.supportsVariableProducts,
            createdAt: orderTypes.createdAt,
          },
        })
        .from(products)
        .leftJoin(orderTypes, eq(products.orderTypeId, orderTypes.id))
        .where(eq(products.sku, sku))
        .limit(1);

      return result[0] ? this.mapDatabaseProductToProduct(result[0]) : null;
    } catch (error) {
      this.logError('findBySku', error, { sku });
      throw error;
    }
  }

  async findAll(options: QueryOptions = {}): Promise<PaginatedResult<Product>> {
    this.logOperation('findAll', { options });

    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        filters = {},
      } = options;
      const offset = (page - 1) * limit;

      // Build where conditions
      const whereConditions = [];

      if (filters.name) {
        whereConditions.push(like(products.name, `%${filters.name}%`));
      }

      if (filters.sku) {
        whereConditions.push(like(products.sku, `%${filters.sku}%`));
      }

      if (filters.orderTypeId) {
        whereConditions.push(eq(products.orderTypeId, filters.orderTypeId as string));
      }

      if (filters.isVariable !== undefined) {
        whereConditions.push(eq(products.isVariable, filters.isVariable as boolean));
      }

      if (filters.isActive !== undefined) {
        whereConditions.push(eq(products.isActive, filters.isActive as boolean));
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      // Get total count
      const totalResult = await db.select({ count: count() }).from(products).where(whereClause);

      const total = totalResult[0]?.count || 0;

      // Get paginated data
      let orderByClause;
      switch (sortBy) {
        case 'name':
          orderByClause = sortOrder === 'asc' ? asc(products.name) : desc(products.name);
          break;
        case 'sku':
          orderByClause = sortOrder === 'asc' ? asc(products.sku) : desc(products.sku);
          break;
        case 'updatedAt':
          orderByClause = sortOrder === 'asc' ? asc(products.updatedAt) : desc(products.updatedAt);
          break;
        default:
          orderByClause = sortOrder === 'asc' ? asc(products.createdAt) : desc(products.createdAt);
      }

      const result = await db
        .select({
          id: products.id,
          name: products.name,
          description: products.description,
          sku: products.sku,
          orderTypeId: products.orderTypeId,
          isVariable: products.isVariable,
          isActive: products.isActive,
          createdBy: products.createdBy,
          createdAt: products.createdAt,
          updatedAt: products.updatedAt,
          orderType: {
            id: orderTypes.id,
            name: orderTypes.name,
            description: orderTypes.description,
            isActive: orderTypes.isActive,
            supportsProducts: orderTypes.supportsProducts,
            supportsVariableProducts: orderTypes.supportsVariableProducts,
            createdAt: orderTypes.createdAt,
          },
        })
        .from(products)
        .leftJoin(orderTypes, eq(products.orderTypeId, orderTypes.id))
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

      const mappedData = result.map((item) => this.mapDatabaseProductToProduct(item));
      const pages = Math.ceil(total / limit);

      return {
        data: mappedData,
        pagination: {
          page,
          limit,
          total,
          pages,
          hasNext: page < pages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      this.logError('findAll', error, { options });
      throw error;
    }
  }

  async create(data: CreateProductData): Promise<Product> {
    this.logOperation('create', { name: data.name, orderTypeId: data.orderTypeId });

    try {
      await this.validateCreate(data);

      const result = await db
        .insert(products)
        .values({
          name: data.name,
          description: data.description,
          sku: data.sku,
          orderTypeId: data.orderTypeId,
          isVariable: data.isVariable ?? false,
          isActive: data.isActive ?? true,
          createdBy: data.createdBy,
          updatedAt: new Date(),
        })
        .returning({
          id: products.id,
        });

      const product = result[0];
      return (await this.findById(product.id))!;
    } catch (error) {
      this.logError('create', error, { name: data.name });
      throw error;
    }
  }

  async update(id: string, data: UpdateProductData): Promise<Product | null> {
    this.logOperation('update', { id, ...data });

    try {
      await this.validateUpdate(id, data);

      const result = await db
        .update(products)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(products.id, id))
        .returning({
          id: products.id,
        });

      if (result.length === 0) {
        return null;
      }

      return await this.findById(id);
    } catch (error) {
      this.logError('update', error, { id, ...data });
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    this.logOperation('delete', { id });

    try {
      await this.validateDelete(id);

      const result = await db
        .delete(products)
        .where(eq(products.id, id))
        .returning({ id: products.id });

      return result.length > 0;
    } catch (error) {
      this.logError('delete', error, { id });
      throw error;
    }
  }

  // Custom methods for product management
  async findByOrderType(
    orderTypeId: string,
    options: QueryOptions = {}
  ): Promise<PaginatedResult<Product>> {
    const updatedOptions = {
      ...options,
      filters: {
        ...options.filters,
        orderTypeId,
      },
    };
    return await this.findAll(updatedOptions);
  }

  async findVariableProducts(options: QueryOptions = {}): Promise<PaginatedResult<Product>> {
    const updatedOptions = {
      ...options,
      filters: {
        ...options.filters,
        isVariable: true,
      },
    };
    return await this.findAll(updatedOptions);
  }

  async getProductVariants(productId: string): Promise<ProductVariant[]> {
    this.logOperation('getProductVariants', { productId });

    try {
      const result = await db
        .select({
          id: productVariants.id,
          productId: productVariants.productId,
          name: productVariants.name,
          variantIdentifier: productVariants.variantIdentifier,
          isActive: productVariants.isActive,
          createdAt: productVariants.createdAt,
          updatedAt: productVariants.updatedAt,
        })
        .from(productVariants)
        .where(eq(productVariants.productId, productId))
        .orderBy(asc(productVariants.name));

      return result.map((variant) => ({
        id: variant.id,
        productId: variant.productId,
        name: variant.name,
        variantIdentifier: variant.variantIdentifier,
        isActive: variant.isActive ?? true,
        createdAt: variant.createdAt || new Date(),
        updatedAt: variant.updatedAt || new Date(),
      }));
    } catch (error) {
      this.logError('getProductVariants', error, { productId });
      throw error;
    }
  }

  // Validation methods
  protected async validateCreate(data: CreateProductData): Promise<void> {
    // Check if SKU already exists (if provided)
    if (data.sku) {
      const existingProduct = await this.findBySku(data.sku);
      if (existingProduct) {
        throw new Error('Product with this SKU already exists');
      }
    }

    // Validate order type exists
    const orderTypeExists = await db
      .select({ id: orderTypes.id, supportsProducts: orderTypes.supportsProducts })
      .from(orderTypes)
      .where(eq(orderTypes.id, data.orderTypeId))
      .limit(1);

    if (orderTypeExists.length === 0) {
      throw new Error('Order type not found');
    }

    // Check if order type supports products
    if (!orderTypeExists[0].supportsProducts) {
      throw new Error('Order type does not support products');
    }

    // Validate variable product logic
    if (data.isVariable) {
      const orderTypeDetails = await db
        .select({ supportsVariableProducts: orderTypes.supportsVariableProducts })
        .from(orderTypes)
        .where(eq(orderTypes.id, data.orderTypeId))
        .limit(1);

      if (!orderTypeDetails[0]?.supportsVariableProducts) {
        throw new Error('Order type does not support variable products');
      }
    }

    // Check for duplicate name within the same order type
    const duplicateName = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.name, data.name), eq(products.orderTypeId, data.orderTypeId)))
      .limit(1);

    if (duplicateName.length > 0) {
      throw new Error('Product with this name already exists for this order type');
    }
  }

  protected async validateUpdate(id: string, data: UpdateProductData): Promise<void> {
    // Check if product exists
    const existingProduct = await this.findById(id);
    if (!existingProduct) {
      throw new Error('Product not found');
    }

    // Check SKU uniqueness if being updated
    if (data.sku && data.sku !== existingProduct.sku) {
      const skuProduct = await this.findBySku(data.sku);
      if (skuProduct && skuProduct.id !== id) {
        throw new Error('SKU already in use by another product');
      }
    }

    // Validate order type if being updated
    if (data.orderTypeId && data.orderTypeId !== existingProduct.orderTypeId) {
      const orderTypeExists = await db
        .select({ id: orderTypes.id, supportsProducts: orderTypes.supportsProducts })
        .from(orderTypes)
        .where(eq(orderTypes.id, data.orderTypeId))
        .limit(1);

      if (orderTypeExists.length === 0) {
        throw new Error('Order type not found');
      }

      if (!orderTypeExists[0].supportsProducts) {
        throw new Error('Order type does not support products');
      }
    }

    // Check name uniqueness within order type if being updated
    if (data.name && data.name !== existingProduct.name) {
      const orderTypeId = data.orderTypeId || existingProduct.orderTypeId;
      const duplicateName = await db
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.name, data.name), eq(products.orderTypeId, orderTypeId)))
        .limit(1);

      if (duplicateName.length > 0 && duplicateName[0].id !== id) {
        throw new Error('Product with this name already exists for this order type');
      }
    }

    // Validate variable product logic if being updated
    if (data.isVariable !== undefined && data.isVariable !== existingProduct.isVariable) {
      if (data.isVariable) {
        const orderTypeId = data.orderTypeId || existingProduct.orderTypeId;
        const orderTypeDetails = await db
          .select({ supportsVariableProducts: orderTypes.supportsVariableProducts })
          .from(orderTypes)
          .where(eq(orderTypes.id, orderTypeId))
          .limit(1);

        if (!orderTypeDetails[0]?.supportsVariableProducts) {
          throw new Error('Order type does not support variable products');
        }
      } else {
        // Check if product has variants before making it non-variable
        const variantCount = await db
          .select({ count: count() })
          .from(productVariants)
          .where(eq(productVariants.productId, id));

        if (variantCount[0]?.count > 0) {
          throw new Error(
            'Cannot make product non-variable while it has variants. Remove variants first.'
          );
        }
      }
    }
  }

  protected async validateDelete(id: string): Promise<void> {
    // Check if product exists
    const existingProduct = await this.findById(id);
    if (!existingProduct) {
      throw new Error('Product not found');
    }

    // Check if product has variants
    const variantCount = await db
      .select({ count: count() })
      .from(productVariants)
      .where(eq(productVariants.productId, id));

    if (variantCount[0]?.count > 0) {
      throw new Error('Cannot delete product with variants. Remove variants first.');
    }

    // Check if product has media
    const mediaCount = await db
      .select({ count: count() })
      .from(productMedias)
      .where(eq(productMedias.productId, id));

    if (mediaCount[0]?.count > 0) {
      throw new Error('Cannot delete product with media files. Remove media first.');
    }
  }
}
