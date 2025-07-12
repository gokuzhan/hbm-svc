// Inquiry Service with Status Management and Assignment

import { ACTIONS, INQUIRY_STATUSES, RESOURCES } from '@/constants';
import { PaginatedResult, QueryOptions } from '@/lib/dal/base';
import { CustomerRepository } from '@/lib/repositories/customer.repository';
import { InquiryRepository } from '@/lib/repositories/inquiry.repository';
import { Inquiry, InquiryStatus } from '@/types';
import { BaseServiceWithAuth } from './base.service';
import { PermissionResult, ServiceContext, ServiceError, ValidationError } from './types';

export interface CreateInquiryData {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  companyName?: string;
  brandName?: string;
  serviceType?: string;
  message: string;
  customerId?: string;
}

export interface UpdateInquiryData {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  companyName?: string;
  brandName?: string;
  serviceType?: string;
  message?: string;
  assignedTo?: string;
}

export interface InquiryStatusTransition {
  inquiryId: string;
  fromStatus: InquiryStatus;
  toStatus: InquiryStatus;
  notes?: string;
}

export class InquiryService extends BaseServiceWithAuth<Inquiry> {
  private inquiryRepository: InquiryRepository;
  private customerRepository: CustomerRepository;

  constructor() {
    const inquiryRepository = new InquiryRepository();
    super(inquiryRepository, RESOURCES.INQUIRIES);
    this.inquiryRepository = inquiryRepository;
    this.customerRepository = new CustomerRepository();
  }

  /**
   * Override customer permission checking
   * Customers can read their own inquiries and create new ones
   */
  protected checkCustomerPermission(context: ServiceContext, action: string): PermissionResult {
    // Customers can read their own inquiries and create new ones
    if (action === ACTIONS.READ || action === ACTIONS.CREATE) {
      return { allowed: true };
    }

    // Customers cannot update, delete, or manage inquiries
    return {
      allowed: false,
      reason: `Customers cannot perform ${action} operations on inquiries`,
    };
  }

  /**
   * Create a new inquiry
   */
  async createInquiry(context: ServiceContext, inquiryData: CreateInquiryData): Promise<Inquiry> {
    await this.requirePermission(context, ACTIONS.CREATE);

    // Validate inquiry data
    await this.validateInquiryData(inquiryData);

    // For customer users, they can only create inquiries for themselves if they provide customerId
    if (
      context.userType === 'customer' &&
      inquiryData.customerId &&
      context.userId !== inquiryData.customerId
    ) {
      throw new ValidationError('Customers can only create inquiries for themselves');
    }

    // If customer is logged in, use their customer ID
    if (context.userType === 'customer' && context.userId) {
      inquiryData.customerId = context.userId;
    }

    const inquiryToCreate = {
      ...inquiryData,
      status: INQUIRY_STATUSES.NEW as InquiryStatus,
      createdBy: context.userId,
    };

    this.logServiceOperation('createInquiry', context, {
      customerEmail: inquiryData.customerEmail,
    });

    try {
      const inquiry = await this.inquiryRepository.create(inquiryToCreate);
      this.logServiceOperation('createInquiry.success', context, { inquiryId: inquiry.id });
      return inquiry;
    } catch (error) {
      this.logServiceOperation('createInquiry.error', context, {
        customerEmail: inquiryData.customerEmail,
        error,
      });
      throw new ServiceError(`Failed to create inquiry: ${(error as Error).message}`);
    }
  }

  /**
   * Update inquiry information (staff only)
   */
  async updateInquiry(
    context: ServiceContext,
    inquiryId: string,
    inquiryData: UpdateInquiryData
  ): Promise<Inquiry | null> {
    await this.requirePermission(context, ACTIONS.UPDATE);

    // Only staff can update inquiries
    if (context.userType === 'customer') {
      throw new ValidationError('Customers cannot update inquiries');
    }

    // Check if inquiry exists
    const existingInquiry = await this.inquiryRepository.findById(inquiryId);
    if (!existingInquiry) {
      throw new ValidationError('Inquiry not found');
    }

    this.logServiceOperation('updateInquiry', context, {
      inquiryId,
      updates: Object.keys(inquiryData),
    });

    try {
      const updatedInquiry = await this.inquiryRepository.update(inquiryId, inquiryData);
      this.logServiceOperation('updateInquiry.success', context, { inquiryId });
      return updatedInquiry;
    } catch (error) {
      this.logServiceOperation('updateInquiry.error', context, { inquiryId, error });
      throw new ServiceError(`Failed to update inquiry: ${(error as Error).message}`);
    }
  }

  /**
   * Assign inquiry to staff member (staff only)
   */
  async assignInquiry(
    context: ServiceContext,
    inquiryId: string,
    assignedTo: string
  ): Promise<Inquiry | null> {
    await this.requirePermission(context, ACTIONS.UPDATE);

    // Only staff can assign inquiries
    if (context.userType === 'customer') {
      throw new ValidationError('Customers cannot assign inquiries');
    }

    const inquiry = await this.inquiryRepository.findById(inquiryId);
    if (!inquiry) {
      throw new ValidationError('Inquiry not found');
    }

    this.logServiceOperation('assignInquiry', context, { inquiryId, assignedTo });

    try {
      const updatedInquiry = await this.inquiryRepository.update(inquiryId, { assignedTo });
      this.logServiceOperation('assignInquiry.success', context, { inquiryId, assignedTo });
      return updatedInquiry;
    } catch (error) {
      this.logServiceOperation('assignInquiry.error', context, { inquiryId, error });
      throw new ServiceError(`Failed to assign inquiry: ${(error as Error).message}`);
    }
  }

  /**
   * Transition inquiry status (staff only)
   */
  async transitionInquiryStatus(
    context: ServiceContext,
    transition: InquiryStatusTransition
  ): Promise<Inquiry | null> {
    await this.requirePermission(context, ACTIONS.UPDATE);

    // Only staff can change inquiry status
    if (context.userType === 'customer') {
      throw new ValidationError('Customers cannot change inquiry status');
    }

    const inquiry = await this.inquiryRepository.findById(transition.inquiryId);
    if (!inquiry) {
      throw new ValidationError('Inquiry not found');
    }

    // Validate status transition
    await this.validateStatusTransition(inquiry, transition.fromStatus, transition.toStatus);

    const statusUpdate = this.getStatusUpdateData(transition.toStatus);

    this.logServiceOperation('transitionInquiryStatus', context, {
      inquiryId: transition.inquiryId,
      fromStatus: transition.fromStatus,
      toStatus: transition.toStatus,
    });

    try {
      const updatedInquiry = await this.inquiryRepository.update(transition.inquiryId, {
        status: transition.toStatus,
        ...statusUpdate,
      });

      // Add status history if available
      // await this.inquiryRepository.addStatusHistory(transition.inquiryId, {
      //   previousStatus: transition.fromStatus,
      //   newStatus: transition.toStatus,
      //   changedBy: context.userId,
      //   notes: transition.notes,
      // });

      this.logServiceOperation('transitionInquiryStatus.success', context, {
        inquiryId: transition.inquiryId,
      });
      return updatedInquiry;
    } catch (error) {
      this.logServiceOperation('transitionInquiryStatus.error', context, {
        inquiryId: transition.inquiryId,
        error,
      });
      throw new ServiceError(`Failed to transition inquiry status: ${(error as Error).message}`);
    }
  }

  /**
   * Get inquiries by customer (with access control)
   */
  async getInquiriesByCustomer(
    context: ServiceContext,
    customerId: string,
    options?: QueryOptions
  ): Promise<PaginatedResult<Inquiry>> {
    await this.requirePermission(context, ACTIONS.READ);

    // Customers can only see their own inquiries
    if (context.userType === 'customer' && context.userId !== customerId) {
      throw new ValidationError('Customers can only view their own inquiries');
    }

    this.logServiceOperation('getInquiriesByCustomer', context, { customerId });

    try {
      const queryOptions = {
        ...options,
        filters: {
          ...options?.filters,
          customerId,
        },
      };
      return await this.inquiryRepository.findAll(queryOptions);
    } catch (error) {
      this.logServiceOperation('getInquiriesByCustomer.error', context, { customerId, error });
      throw new ServiceError(`Failed to get customer inquiries: ${(error as Error).message}`);
    }
  }

  /**
   * Get inquiries assigned to staff member
   */
  async getAssignedInquiries(
    context: ServiceContext,
    staffId: string,
    options?: QueryOptions
  ): Promise<PaginatedResult<Inquiry>> {
    await this.requirePermission(context, ACTIONS.READ);

    // Only staff can view assigned inquiries
    if (context.userType === 'customer') {
      throw new ValidationError('Customers cannot view assigned inquiries');
    }

    // Staff can view inquiries assigned to them or all if they have permissions
    if (
      context.userId !== staffId &&
      !context.permissions.includes(`${RESOURCES.INQUIRIES}:${ACTIONS.MANAGE}`)
    ) {
      throw new ValidationError('You can only view inquiries assigned to you');
    }

    this.logServiceOperation('getAssignedInquiries', context, { staffId });

    try {
      const queryOptions = {
        ...options,
        filters: {
          ...options?.filters,
          assignedTo: staffId,
        },
      };
      return await this.inquiryRepository.findAll(queryOptions);
    } catch (error) {
      this.logServiceOperation('getAssignedInquiries.error', context, { staffId, error });
      throw new ServiceError(`Failed to get assigned inquiries: ${(error as Error).message}`);
    }
  }

  /**
   * Get inquiries by status
   */
  async getInquiriesByStatus(
    context: ServiceContext,
    status: InquiryStatus,
    options?: QueryOptions
  ): Promise<PaginatedResult<Inquiry>> {
    await this.requirePermission(context, ACTIONS.READ);

    // Only staff can filter by status
    if (context.userType === 'customer') {
      throw new ValidationError('Customers cannot filter inquiries by status');
    }

    this.logServiceOperation('getInquiriesByStatus', context, { status });

    try {
      const queryOptions = {
        ...options,
        filters: {
          ...options?.filters,
          status,
        },
      };
      return await this.inquiryRepository.findAll(queryOptions);
    } catch (error) {
      this.logServiceOperation('getInquiriesByStatus.error', context, { status, error });
      throw new ServiceError(`Failed to get inquiries by status: ${(error as Error).message}`);
    }
  }

  /**
   * Get customer's own inquiries
   */
  async getMyInquiries(
    context: ServiceContext,
    options?: QueryOptions
  ): Promise<PaginatedResult<Inquiry>> {
    if (context.userType !== 'customer' || !context.userId) {
      throw new ValidationError('Invalid customer context');
    }

    return this.getInquiriesByCustomer(context, context.userId, options);
  }

  // Protected methods implementation
  protected async validateCreate(
    context: ServiceContext,
    data: Omit<Inquiry, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<void> {
    if (!data.customerName || !data.customerEmail || !data.message) {
      throw new ValidationError('Customer name, email, and message are required');
    }
  }

  protected async validateUpdate(
    context: ServiceContext,
    id: string,
    data: Partial<Inquiry>
  ): Promise<void> {
    if (data.customerEmail && !this.isValidEmail(data.customerEmail)) {
      throw new ValidationError('Invalid email format');
    }
  }

  protected async validateDelete(context: ServiceContext, id: string): Promise<void> {
    // Check if inquiry has any dependent records
    const inquiry = await this.inquiryRepository.findById(id);
    if (!inquiry) {
      throw new ValidationError('Inquiry not found');
    }

    // Additional business logic for inquiry deletion
    if (inquiry.status !== INQUIRY_STATUSES.NEW) {
      throw new ValidationError('Only new inquiries can be deleted');
    }
  }

  protected async checkCustomerAccess(context: ServiceContext, entity: Inquiry): Promise<boolean> {
    // Customers can only access their own inquiries
    if (context.userType === 'customer') {
      return context.userId === entity.customerId;
    }
    // Staff can access all inquiries
    return true;
  }

  protected async applyCustomerFilters(
    context: ServiceContext,
    options?: QueryOptions
  ): Promise<QueryOptions | undefined> {
    if (context.userType === 'customer') {
      // Customers can only see their own inquiries
      return {
        ...options,
        filters: {
          ...options?.filters,
          customerId: context.userId,
        },
      };
    }
    return options;
  }

  // Private helper methods
  private async validateInquiryData(inquiryData: CreateInquiryData): Promise<void> {
    if (!inquiryData.customerName || inquiryData.customerName.trim().length === 0) {
      throw new ValidationError('Customer name is required');
    }

    if (!inquiryData.customerEmail || !this.isValidEmail(inquiryData.customerEmail)) {
      throw new ValidationError('Valid customer email is required');
    }

    if (!inquiryData.message || inquiryData.message.trim().length === 0) {
      throw new ValidationError('Message is required');
    }

    if (inquiryData.customerPhone && !this.isValidPhone(inquiryData.customerPhone)) {
      throw new ValidationError('Invalid phone format');
    }
  }

  private async validateStatusTransition(
    inquiry: Inquiry,
    fromStatus: InquiryStatus,
    toStatus: InquiryStatus
  ): Promise<void> {
    if (inquiry.status !== fromStatus) {
      throw new ValidationError(
        `Inquiry is currently in status ${inquiry.status}, not ${fromStatus}`
      );
    }

    // Define valid status transitions
    const validTransitions: Record<InquiryStatus, InquiryStatus[]> = {
      [INQUIRY_STATUSES.REJECTED]: [], // Rejected is final
      [INQUIRY_STATUSES.NEW]: [INQUIRY_STATUSES.ACCEPTED, INQUIRY_STATUSES.REJECTED],
      [INQUIRY_STATUSES.ACCEPTED]: [INQUIRY_STATUSES.IN_PROGRESS, INQUIRY_STATUSES.REJECTED],
      [INQUIRY_STATUSES.IN_PROGRESS]: [INQUIRY_STATUSES.CLOSED, INQUIRY_STATUSES.ACCEPTED],
      [INQUIRY_STATUSES.CLOSED]: [], // Closed is final
    };

    const allowedNextStatuses = validTransitions[fromStatus] || [];
    if (!allowedNextStatuses.includes(toStatus)) {
      throw new ValidationError(`Invalid status transition from ${fromStatus} to ${toStatus}`);
    }
  }

  private getStatusUpdateData(status: InquiryStatus): Partial<Inquiry> {
    const now = new Date();

    switch (status) {
      case INQUIRY_STATUSES.ACCEPTED:
        return { acceptedAt: now };
      case INQUIRY_STATUSES.REJECTED:
        return { rejectedAt: now };
      case INQUIRY_STATUSES.CLOSED:
        return { closedAt: now };
      default:
        return {};
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPhone(phone: string): boolean {
    // Basic phone validation - can be enhanced
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
  }
}
