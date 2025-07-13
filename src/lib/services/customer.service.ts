// Customer Service with Access Control

import { ACTIONS, RESOURCES } from '@/constants';
import { QueryOptions } from '@/lib/dal/base';
import { CustomerRepository } from '@/lib/repositories/customer.repository';
import { Customer } from '@/types';
import { isValidEmail, isValidPhoneNumber } from '../validation';
import { BaseServiceWithAuth } from './base.service';
import { PermissionResult, ServiceContext, ServiceError, ValidationError } from './types';

export interface CreateCustomerData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  companyName?: string;
  brandName?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  profileMediaId?: string;
  isActive?: boolean;
}

export interface UpdateCustomerData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  brandName?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  profileMediaId?: string;
  isActive?: boolean;
}

export class CustomerService extends BaseServiceWithAuth<Customer> {
  private customerRepository: CustomerRepository;

  constructor() {
    const customerRepository = new CustomerRepository();
    super(customerRepository, RESOURCES.CUSTOMERS);
    this.customerRepository = customerRepository;
  }

  /**
   * Override customer permission checking
   * Customers can only access their own data
   */
  protected checkCustomerPermission(context: ServiceContext, action: string): PermissionResult {
    // Customers can read and update their own profile data
    if (action === ACTIONS.READ || action === ACTIONS.UPDATE) {
      return { allowed: true };
    }

    // Customers cannot create, delete, or manage other customers
    return {
      allowed: false,
      reason: `Customers cannot perform ${action} operations on customer records`,
    };
  }

  /**
   * Create a new customer (staff only)
   */
  async createCustomer(
    context: ServiceContext,
    customerData: CreateCustomerData
  ): Promise<Customer> {
    await this.requirePermission(context, ACTIONS.CREATE);

    // Only staff can create customers
    if (context.userType === 'customer') {
      throw new ValidationError('Customers cannot create customer records');
    }

    // Validate customer data
    await this.validateCustomerData(customerData);

    // Check if email already exists
    const existingCustomer = await this.customerRepository.findByEmail(customerData.email);
    if (existingCustomer) {
      throw new ValidationError('Email already exists');
    }

    const customerToCreate = {
      ...customerData,
      isActive: customerData.isActive ?? true,
      createdBy: context.userId,
    };

    this.logServiceOperation('createCustomer', context, { email: customerData.email });

    try {
      const customer = await this.customerRepository.create(customerToCreate);
      this.logServiceOperation('createCustomer.success', context, { customerId: customer.id });
      return customer;
    } catch (error) {
      this.logServiceOperation('createCustomer.error', context, {
        email: customerData.email,
        error,
      });
      throw new ServiceError(`Failed to create customer: ${(error as Error).message}`);
    }
  }

  /**
   * Update customer information
   */
  async updateCustomer(
    context: ServiceContext,
    customerId: string,
    customerData: UpdateCustomerData
  ): Promise<Customer | null> {
    await this.requirePermission(context, ACTIONS.UPDATE);

    // Check if customer exists
    const existingCustomer = await this.customerRepository.findById(customerId);
    if (!existingCustomer) {
      throw new ValidationError('Customer not found');
    }

    // Customer access control
    if (context.userType === 'customer') {
      // Customers can only edit their own profile
      if (context.userId !== customerId) {
        throw new ValidationError('Customers can only edit their own profile');
      }
    }

    // Validate email if being changed
    if (customerData.email && customerData.email !== existingCustomer.email) {
      const emailExists = await this.customerRepository.findByEmail(customerData.email);
      if (emailExists) {
        throw new ValidationError('Email already exists');
      }
    }

    this.logServiceOperation('updateCustomer', context, {
      customerId,
      updates: Object.keys(customerData),
    });

    try {
      const updatedCustomer = await this.customerRepository.update(customerId, customerData);
      this.logServiceOperation('updateCustomer.success', context, { customerId });
      return updatedCustomer;
    } catch (error) {
      this.logServiceOperation('updateCustomer.error', context, { customerId, error });
      throw new ServiceError(`Failed to update customer: ${(error as Error).message}`);
    }
  }

  /**
   * Find customer by email (staff only)
   */
  async findByEmail(context: ServiceContext, email: string): Promise<Customer | null> {
    await this.requirePermission(context, ACTIONS.READ);

    // Only staff can search by email
    if (context.userType === 'customer') {
      throw new ValidationError('Customers cannot search by email');
    }

    this.logServiceOperation('findByEmail', context, { email });

    try {
      return await this.customerRepository.findByEmail(email);
    } catch (error) {
      this.logServiceOperation('findByEmail.error', context, { email, error });
      throw new ServiceError(`Failed to find customer by email: ${(error as Error).message}`);
    }
  }

  /**
   * Activate/Deactivate customer (staff only)
   */
  async toggleCustomerStatus(
    context: ServiceContext,
    customerId: string,
    isActive: boolean
  ): Promise<Customer | null> {
    await this.requirePermission(context, ACTIONS.UPDATE);

    // Only staff can change customer status
    if (context.userType === 'customer') {
      throw new ValidationError('Customers cannot change account status');
    }

    const customer = await this.customerRepository.findById(customerId);
    if (!customer) {
      throw new ValidationError('Customer not found');
    }

    this.logServiceOperation('toggleCustomerStatus', context, { customerId, isActive });

    try {
      const updatedCustomer = await this.customerRepository.update(customerId, { isActive });
      this.logServiceOperation('toggleCustomerStatus.success', context, { customerId, isActive });
      return updatedCustomer;
    } catch (error) {
      this.logServiceOperation('toggleCustomerStatus.error', context, { customerId, error });
      throw new ServiceError(`Failed to update customer status: ${(error as Error).message}`);
    }
  }

  /**
   * Get customer profile (for customer's own use)
   */
  async getMyProfile(context: ServiceContext): Promise<Customer | null> {
    if (context.userType !== 'customer' || !context.userId) {
      throw new ValidationError('Invalid customer context');
    }

    this.logServiceOperation('getMyProfile', context);

    try {
      return await this.customerRepository.findById(context.userId);
    } catch (error) {
      this.logServiceOperation('getMyProfile.error', context, { error });
      throw new ServiceError(`Failed to get customer profile: ${(error as Error).message}`);
    }
  }

  /**
   * Update customer profile (for customer's own use)
   */
  async updateMyProfile(
    context: ServiceContext,
    customerData: UpdateCustomerData
  ): Promise<Customer | null> {
    if (context.userType !== 'customer' || !context.userId) {
      throw new ValidationError('Invalid customer context');
    }

    // Remove fields customers cannot update themselves
    const allowedUpdates: UpdateCustomerData = {
      firstName: customerData.firstName,
      lastName: customerData.lastName,
      phone: customerData.phone,
      companyName: customerData.companyName,
      brandName: customerData.brandName,
      address: customerData.address,
      city: customerData.city,
      state: customerData.state,
      country: customerData.country,
      postalCode: customerData.postalCode,
      profileMediaId: customerData.profileMediaId,
    };

    return this.updateCustomer(context, context.userId, allowedUpdates);
  }

  // Protected methods implementation
  protected async validateCreate(
    context: ServiceContext,
    data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<void> {
    // Additional validation specific to customer creation
    if (!data.email || !data.firstName || !data.lastName) {
      throw new ValidationError('Email, first name, and last name are required');
    }
  }

  protected async validateUpdate(
    context: ServiceContext,
    id: string,
    data: Partial<Customer>
  ): Promise<void> {
    // Additional validation specific to customer updates
    if (data.email && !this.isValidEmail(data.email)) {
      throw new ValidationError('Invalid email format');
    }
  }

  protected async validateDelete(context: ServiceContext, id: string): Promise<void> {
    // Check if customer has any dependent records (orders, inquiries)
    const customer = await this.customerRepository.findById(id);
    if (!customer) {
      throw new ValidationError('Customer not found');
    }

    // Additional business logic for customer deletion
    // Could check for active orders, inquiries, etc.
  }

  protected async checkCustomerAccess(context: ServiceContext, entity: Customer): Promise<boolean> {
    // Customers can only access their own data
    if (context.userType === 'customer') {
      return context.userId === entity.id;
    }
    // Staff can access all customer data
    return true;
  }

  protected async applyCustomerFilters(
    context: ServiceContext,
    options?: QueryOptions
  ): Promise<QueryOptions | undefined> {
    if (context.userType === 'customer') {
      // Customers can only see their own record
      return {
        ...options,
        filters: {
          ...options?.filters,
          id: context.userId,
        },
      };
    }
    return options;
  }

  // Private validation methods
  private async validateCustomerData(customerData: CreateCustomerData): Promise<void> {
    if (!customerData.email || !this.isValidEmail(customerData.email)) {
      throw new ValidationError('Valid email is required');
    }

    if (!customerData.firstName || customerData.firstName.trim().length === 0) {
      throw new ValidationError('First name is required');
    }

    if (!customerData.lastName || customerData.lastName.trim().length === 0) {
      throw new ValidationError('Last name is required');
    }

    if (customerData.phone && !this.isValidPhone(customerData.phone)) {
      throw new ValidationError('Invalid phone format');
    }

    if (customerData.email && customerData.email.trim().length === 0) {
      throw new ValidationError('Email cannot be empty');
    }
  }

  // Using centralized validation from validation module
  // These methods are kept for backward compatibility but delegate to centralized validation
  private isValidEmail(email: string): boolean {
    return isValidEmail(email);
  }

  private isValidPhone(phone: string): boolean {
    return isValidPhoneNumber(phone);
  }
}
