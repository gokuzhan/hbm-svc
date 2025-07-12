import { ACTIONS, INQUIRY_STATUSES, RESOURCES } from '@/constants';
import { CustomerRepository } from '@/lib/repositories/customer.repository';
import { InquiryRepository } from '@/lib/repositories/inquiry.repository';
import {
  CreateInquiryData,
  InquiryService,
  InquiryStatusTransition,
  UpdateInquiryData,
} from '@/lib/services/inquiry.service';
import {
  PermissionError,
  PermissionResult,
  ServiceContext,
  ServiceError,
  ServiceQueryOptions,
  ValidationError,
} from '@/lib/services/types';
import { Inquiry, InquiryStatus } from '@/types';

// Mock the repositories
jest.mock('@/lib/repositories/inquiry.repository');
jest.mock('@/lib/repositories/customer.repository');

const MockedInquiryRepository = InquiryRepository as jest.MockedClass<typeof InquiryRepository>;
const MockedCustomerRepository = CustomerRepository as jest.MockedClass<typeof CustomerRepository>;

describe('InquiryService', () => {
  let inquiryService: InquiryService;
  let mockInquiryRepository: jest.Mocked<InquiryRepository>;
  let mockCustomerRepository: jest.Mocked<CustomerRepository>;

  const mockStaffContext: ServiceContext = {
    userId: 'staff-1',
    userType: 'staff',
    permissions: [
      `${RESOURCES.INQUIRIES}:${ACTIONS.CREATE}`,
      `${RESOURCES.INQUIRIES}:${ACTIONS.READ}`,
      `${RESOURCES.INQUIRIES}:${ACTIONS.UPDATE}`,
      `${RESOURCES.INQUIRIES}:${ACTIONS.DELETE}`,
      `${RESOURCES.INQUIRIES}:${ACTIONS.MANAGE}`,
    ],
  };

  const mockCustomerContext: ServiceContext = {
    userId: 'customer-1',
    userType: 'customer',
    permissions: [
      `${RESOURCES.INQUIRIES}:${ACTIONS.READ}`,
      `${RESOURCES.INQUIRIES}:${ACTIONS.CREATE}`,
    ],
  };

  const mockInquiry: Inquiry = {
    id: 'inquiry-1',
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    customerPhone: '+1234567890',
    companyName: 'Test Company',
    brandName: 'Test Brand',
    serviceType: 'Consultation',
    message: 'Test inquiry message',
    customerId: 'customer-1',
    status: INQUIRY_STATUSES.NEW as InquiryStatus,
    assignedTo: undefined,
    acceptedAt: undefined,
    rejectedAt: undefined,
    closedAt: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'customer-1',
  };

  const mockAcceptedInquiry: Inquiry = {
    ...mockInquiry,
    id: 'inquiry-2',
    status: INQUIRY_STATUSES.ACCEPTED as InquiryStatus,
    acceptedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockInquiryRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      logOperation: jest.fn(),
    } as unknown as jest.Mocked<InquiryRepository>;

    mockCustomerRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      logOperation: jest.fn(),
    } as unknown as jest.Mocked<CustomerRepository>;

    MockedInquiryRepository.mockImplementation(() => mockInquiryRepository);
    MockedCustomerRepository.mockImplementation(() => mockCustomerRepository);
    inquiryService = new InquiryService();
  });

  describe('createInquiry', () => {
    const validInquiryData: CreateInquiryData = {
      customerName: 'Jane Doe',
      customerEmail: 'jane@example.com',
      customerPhone: '+1234567890',
      companyName: 'New Company',
      brandName: 'New Brand',
      serviceType: 'Design',
      message: 'Need help with branding',
    };

    it('should create inquiry successfully for staff', async () => {
      mockInquiryRepository.create.mockResolvedValue(mockInquiry);

      const result = await inquiryService.createInquiry(mockStaffContext, validInquiryData);

      expect(result).toEqual(mockInquiry);
      expect(mockInquiryRepository.create).toHaveBeenCalledWith({
        ...validInquiryData,
        status: INQUIRY_STATUSES.NEW,
        createdBy: 'staff-1',
      });
    });

    it('should create inquiry successfully for customer', async () => {
      mockInquiryRepository.create.mockResolvedValue(mockInquiry);

      const result = await inquiryService.createInquiry(mockCustomerContext, validInquiryData);

      expect(result).toEqual(mockInquiry);
      expect(mockInquiryRepository.create).toHaveBeenCalledWith({
        ...validInquiryData,
        status: INQUIRY_STATUSES.NEW,
        customerId: 'customer-1', // Should auto-assign customer ID
        createdBy: 'customer-1',
      });
    });

    it('should throw error if customer tries to create inquiry for another customer', async () => {
      const dataWithDifferentCustomerId = {
        ...validInquiryData,
        customerId: 'different-customer',
      };

      await expect(
        inquiryService.createInquiry(mockCustomerContext, dataWithDifferentCustomerId)
      ).rejects.toThrow(ValidationError);

      expect(mockInquiryRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error if customer name is missing', async () => {
      const invalidData = { ...validInquiryData, customerName: '' };

      await expect(inquiryService.createInquiry(mockStaffContext, invalidData)).rejects.toThrow(
        ValidationError
      );

      expect(mockInquiryRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error if customer email is invalid', async () => {
      const invalidData = { ...validInquiryData, customerEmail: 'invalid-email' };

      await expect(inquiryService.createInquiry(mockStaffContext, invalidData)).rejects.toThrow(
        ValidationError
      );

      expect(mockInquiryRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error if message is missing', async () => {
      const invalidData = { ...validInquiryData, message: '' };

      await expect(inquiryService.createInquiry(mockStaffContext, invalidData)).rejects.toThrow(
        ValidationError
      );

      expect(mockInquiryRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error if phone is invalid', async () => {
      const invalidData = { ...validInquiryData, customerPhone: '123' };

      await expect(inquiryService.createInquiry(mockStaffContext, invalidData)).rejects.toThrow(
        ValidationError
      );

      expect(mockInquiryRepository.create).not.toHaveBeenCalled();
    });

    it('should handle repository errors', async () => {
      mockInquiryRepository.create.mockRejectedValue(new Error('Database error'));

      await expect(
        inquiryService.createInquiry(mockStaffContext, validInquiryData)
      ).rejects.toThrow(ServiceError);
    });
  });

  describe('updateInquiry', () => {
    const updateData: UpdateInquiryData = {
      customerName: 'Updated Name',
      message: 'Updated message',
      assignedTo: 'staff-2',
    };

    it('should update inquiry successfully for staff', async () => {
      mockInquiryRepository.findById.mockResolvedValue(mockInquiry);
      mockInquiryRepository.update.mockResolvedValue({ ...mockInquiry, ...updateData });

      const result = await inquiryService.updateInquiry(mockStaffContext, 'inquiry-1', updateData);

      expect(result).toEqual({ ...mockInquiry, ...updateData });
      expect(mockInquiryRepository.findById).toHaveBeenCalledWith('inquiry-1');
      expect(mockInquiryRepository.update).toHaveBeenCalledWith('inquiry-1', updateData);
    });

    it('should throw error if customer tries to update inquiry', async () => {
      await expect(
        inquiryService.updateInquiry(mockCustomerContext, 'inquiry-1', updateData)
      ).rejects.toThrow(PermissionError);

      expect(mockInquiryRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error if inquiry not found', async () => {
      mockInquiryRepository.findById.mockResolvedValue(null);

      await expect(
        inquiryService.updateInquiry(mockStaffContext, 'non-existent', updateData)
      ).rejects.toThrow(ValidationError);

      expect(mockInquiryRepository.update).not.toHaveBeenCalled();
    });

    it('should handle repository errors', async () => {
      mockInquiryRepository.findById.mockResolvedValue(mockInquiry);
      mockInquiryRepository.update.mockRejectedValue(new Error('Database error'));

      await expect(
        inquiryService.updateInquiry(mockStaffContext, 'inquiry-1', updateData)
      ).rejects.toThrow(ServiceError);
    });
  });

  describe('assignInquiry', () => {
    it('should assign inquiry successfully for staff', async () => {
      mockInquiryRepository.findById.mockResolvedValue(mockInquiry);
      mockInquiryRepository.update.mockResolvedValue({ ...mockInquiry, assignedTo: 'staff-2' });

      const result = await inquiryService.assignInquiry(mockStaffContext, 'inquiry-1', 'staff-2');

      expect(result).toEqual({ ...mockInquiry, assignedTo: 'staff-2' });
      expect(mockInquiryRepository.update).toHaveBeenCalledWith('inquiry-1', {
        assignedTo: 'staff-2',
      });
    });

    it('should throw error if customer tries to assign inquiry', async () => {
      await expect(
        inquiryService.assignInquiry(mockCustomerContext, 'inquiry-1', 'staff-2')
      ).rejects.toThrow(PermissionError);

      expect(mockInquiryRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error if inquiry not found', async () => {
      mockInquiryRepository.findById.mockResolvedValue(null);

      await expect(
        inquiryService.assignInquiry(mockStaffContext, 'non-existent', 'staff-2')
      ).rejects.toThrow(ValidationError);

      expect(mockInquiryRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('transitionInquiryStatus', () => {
    const validTransition: InquiryStatusTransition = {
      inquiryId: 'inquiry-1',
      fromStatus: INQUIRY_STATUSES.NEW as InquiryStatus,
      toStatus: INQUIRY_STATUSES.ACCEPTED as InquiryStatus,
      notes: 'Accepting inquiry',
    };

    it('should transition status successfully for staff', async () => {
      mockInquiryRepository.findById.mockResolvedValue(mockInquiry);
      const expectedResult = {
        ...mockInquiry,
        status: INQUIRY_STATUSES.ACCEPTED as InquiryStatus,
        acceptedAt: expect.any(Date),
      };
      mockInquiryRepository.update.mockResolvedValue(expectedResult);

      const result = await inquiryService.transitionInquiryStatus(
        mockStaffContext,
        validTransition
      );

      expect(result).toEqual(expectedResult);
      expect(mockInquiryRepository.update).toHaveBeenCalledWith('inquiry-1', {
        status: INQUIRY_STATUSES.ACCEPTED,
        acceptedAt: expect.any(Date),
      });
    });

    it('should throw error if customer tries to transition status', async () => {
      await expect(
        inquiryService.transitionInquiryStatus(mockCustomerContext, validTransition)
      ).rejects.toThrow(PermissionError);

      expect(mockInquiryRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error if inquiry not found', async () => {
      mockInquiryRepository.findById.mockResolvedValue(null);

      await expect(
        inquiryService.transitionInquiryStatus(mockStaffContext, validTransition)
      ).rejects.toThrow(ValidationError);

      expect(mockInquiryRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error if current status does not match fromStatus', async () => {
      const inquiryWithDifferentStatus = {
        ...mockInquiry,
        status: INQUIRY_STATUSES.ACCEPTED as InquiryStatus,
      };
      mockInquiryRepository.findById.mockResolvedValue(inquiryWithDifferentStatus);

      await expect(
        inquiryService.transitionInquiryStatus(mockStaffContext, validTransition)
      ).rejects.toThrow(ValidationError);

      expect(mockInquiryRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error for invalid status transition', async () => {
      const invalidTransition: InquiryStatusTransition = {
        inquiryId: 'inquiry-1',
        fromStatus: INQUIRY_STATUSES.NEW as InquiryStatus,
        toStatus: INQUIRY_STATUSES.CLOSED as InquiryStatus, // Invalid: NEW -> CLOSED
      };

      mockInquiryRepository.findById.mockResolvedValue(mockInquiry);

      await expect(
        inquiryService.transitionInquiryStatus(mockStaffContext, invalidTransition)
      ).rejects.toThrow(ValidationError);

      expect(mockInquiryRepository.update).not.toHaveBeenCalled();
    });

    it('should handle different status update data', async () => {
      const rejectTransition: InquiryStatusTransition = {
        inquiryId: 'inquiry-1',
        fromStatus: INQUIRY_STATUSES.NEW as InquiryStatus,
        toStatus: INQUIRY_STATUSES.REJECTED as InquiryStatus,
      };

      mockInquiryRepository.findById.mockResolvedValue(mockInquiry);
      const expectedResult = {
        ...mockInquiry,
        status: INQUIRY_STATUSES.REJECTED as InquiryStatus,
        rejectedAt: expect.any(Date),
      };
      mockInquiryRepository.update.mockResolvedValue(expectedResult);

      const result = await inquiryService.transitionInquiryStatus(
        mockStaffContext,
        rejectTransition
      );

      expect(result).toEqual(expectedResult);
      expect(mockInquiryRepository.update).toHaveBeenCalledWith('inquiry-1', {
        status: INQUIRY_STATUSES.REJECTED,
        rejectedAt: expect.any(Date),
      });
    });
  });

  describe('getInquiriesByCustomer', () => {
    it('should get customer inquiries successfully for staff', async () => {
      const mockResult = {
        data: [mockInquiry],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          pages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      mockInquiryRepository.findAll.mockResolvedValue(mockResult);

      const result = await inquiryService.getInquiriesByCustomer(mockStaffContext, 'customer-1');

      expect(result).toEqual(mockResult);
      expect(mockInquiryRepository.findAll).toHaveBeenCalledWith({
        filters: {
          customerId: 'customer-1',
        },
      });
    });

    it('should allow customers to view their own inquiries', async () => {
      const mockResult = {
        data: [mockInquiry],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          pages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      mockInquiryRepository.findAll.mockResolvedValue(mockResult);

      const result = await inquiryService.getInquiriesByCustomer(mockCustomerContext, 'customer-1');

      expect(result).toEqual(mockResult);
    });

    it('should throw error if customer tries to view other customer inquiries', async () => {
      await expect(
        inquiryService.getInquiriesByCustomer(mockCustomerContext, 'different-customer')
      ).rejects.toThrow(ValidationError);

      expect(mockInquiryRepository.findAll).not.toHaveBeenCalled();
    });
  });

  describe('getAssignedInquiries', () => {
    it('should get assigned inquiries for staff', async () => {
      const mockResult = {
        data: [{ ...mockInquiry, assignedTo: 'staff-1' }],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          pages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      mockInquiryRepository.findAll.mockResolvedValue(mockResult);

      const result = await inquiryService.getAssignedInquiries(mockStaffContext, 'staff-1');

      expect(result).toEqual(mockResult);
      expect(mockInquiryRepository.findAll).toHaveBeenCalledWith({
        filters: {
          assignedTo: 'staff-1',
        },
      });
    });

    it('should throw error if customer tries to view assigned inquiries', async () => {
      await expect(
        inquiryService.getAssignedInquiries(mockCustomerContext, 'staff-1')
      ).rejects.toThrow(ValidationError);

      expect(mockInquiryRepository.findAll).not.toHaveBeenCalled();
    });

    it('should throw error if staff tries to view inquiries assigned to others without manage permission', async () => {
      const limitedStaffContext = {
        ...mockStaffContext,
        permissions: [
          `${RESOURCES.INQUIRIES}:${ACTIONS.READ}`,
          `${RESOURCES.INQUIRIES}:${ACTIONS.UPDATE}`,
        ],
      };

      await expect(
        inquiryService.getAssignedInquiries(limitedStaffContext, 'different-staff')
      ).rejects.toThrow(ValidationError);

      expect(mockInquiryRepository.findAll).not.toHaveBeenCalled();
    });
  });

  describe('getInquiriesByStatus', () => {
    it('should get inquiries by status for staff', async () => {
      const mockResult = {
        data: [mockAcceptedInquiry],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          pages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      mockInquiryRepository.findAll.mockResolvedValue(mockResult);

      const result = await inquiryService.getInquiriesByStatus(
        mockStaffContext,
        INQUIRY_STATUSES.ACCEPTED as InquiryStatus
      );

      expect(result).toEqual(mockResult);
      expect(mockInquiryRepository.findAll).toHaveBeenCalledWith({
        filters: {
          status: INQUIRY_STATUSES.ACCEPTED,
        },
      });
    });

    it('should throw error if customer tries to filter by status', async () => {
      await expect(
        inquiryService.getInquiriesByStatus(
          mockCustomerContext,
          INQUIRY_STATUSES.ACCEPTED as InquiryStatus
        )
      ).rejects.toThrow(ValidationError);

      expect(mockInquiryRepository.findAll).not.toHaveBeenCalled();
    });
  });

  describe('getMyInquiries', () => {
    it('should get customer own inquiries', async () => {
      const mockResult = {
        data: [mockInquiry],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          pages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      mockInquiryRepository.findAll.mockResolvedValue(mockResult);

      const result = await inquiryService.getMyInquiries(mockCustomerContext);

      expect(result).toEqual(mockResult);
      expect(mockInquiryRepository.findAll).toHaveBeenCalledWith({
        filters: {
          customerId: 'customer-1',
        },
      });
    });

    it('should throw error if called by staff', async () => {
      await expect(inquiryService.getMyInquiries(mockStaffContext)).rejects.toThrow(
        ValidationError
      );
    });

    it('should throw error if customer context has no userId', async () => {
      const invalidCustomerContext = { ...mockCustomerContext, userId: undefined };

      await expect(inquiryService.getMyInquiries(invalidCustomerContext)).rejects.toThrow(
        ValidationError
      );
    });
  });

  describe('checkCustomerPermission', () => {
    it('should allow customers to read inquiries', () => {
      const service = new InquiryService();
      const result = (
        service as InquiryService & {
          checkCustomerPermission: (context: ServiceContext, action: string) => PermissionResult;
        }
      ).checkCustomerPermission(mockCustomerContext, ACTIONS.READ);

      expect(result.allowed).toBe(true);
    });

    it('should allow customers to create inquiries', () => {
      const service = new InquiryService();
      const result = (
        service as InquiryService & {
          checkCustomerPermission: (context: ServiceContext, action: string) => PermissionResult;
        }
      ).checkCustomerPermission(mockCustomerContext, ACTIONS.CREATE);

      expect(result.allowed).toBe(true);
    });

    it('should deny customers from updating inquiries', () => {
      const service = new InquiryService();
      const result = (
        service as InquiryService & {
          checkCustomerPermission: (context: ServiceContext, action: string) => PermissionResult;
        }
      ).checkCustomerPermission(mockCustomerContext, ACTIONS.UPDATE);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Customers cannot perform');
    });

    it('should deny customers from deleting inquiries', () => {
      const service = new InquiryService();
      const result = (
        service as InquiryService & {
          checkCustomerPermission: (context: ServiceContext, action: string) => PermissionResult;
        }
      ).checkCustomerPermission(mockCustomerContext, ACTIONS.DELETE);

      expect(result.allowed).toBe(false);
    });
  });

  describe('checkCustomerAccess', () => {
    it('should allow customers to access their own inquiries', async () => {
      const service = new InquiryService();
      const result = await (
        service as InquiryService & {
          checkCustomerAccess: (context: ServiceContext, entity: Inquiry) => Promise<boolean>;
        }
      ).checkCustomerAccess(mockCustomerContext, mockInquiry);

      expect(result).toBe(true);
    });

    it('should deny customers access to other customer inquiries', async () => {
      const otherCustomerInquiry = { ...mockInquiry, customerId: 'different-customer' };
      const service = new InquiryService();
      const result = await (
        service as InquiryService & {
          checkCustomerAccess: (context: ServiceContext, entity: Inquiry) => Promise<boolean>;
        }
      ).checkCustomerAccess(mockCustomerContext, otherCustomerInquiry);

      expect(result).toBe(false);
    });

    it('should allow staff to access all inquiries', async () => {
      const service = new InquiryService();
      const result = await (
        service as InquiryService & {
          checkCustomerAccess: (context: ServiceContext, entity: Inquiry) => Promise<boolean>;
        }
      ).checkCustomerAccess(mockStaffContext, mockInquiry);

      expect(result).toBe(true);
    });
  });

  describe('applyCustomerFilters', () => {
    it('should add customerId filter for customers', async () => {
      const service = new InquiryService();
      const options = { limit: 10 };
      const result = await (
        service as InquiryService & {
          applyCustomerFilters: (
            context: ServiceContext,
            options: ServiceQueryOptions
          ) => Promise<ServiceQueryOptions>;
        }
      ).applyCustomerFilters(mockCustomerContext, options);

      expect(result).toEqual({
        limit: 10,
        filters: {
          customerId: 'customer-1',
        },
      });
    });

    it('should preserve existing filters for customers', async () => {
      const service = new InquiryService();
      const options = {
        limit: 10,
        filters: { status: INQUIRY_STATUSES.NEW },
      };
      const result = await (
        service as InquiryService & {
          applyCustomerFilters: (
            context: ServiceContext,
            options: ServiceQueryOptions
          ) => Promise<ServiceQueryOptions>;
        }
      ).applyCustomerFilters(mockCustomerContext, options);

      expect(result).toEqual({
        limit: 10,
        filters: {
          status: INQUIRY_STATUSES.NEW,
          customerId: 'customer-1',
        },
      });
    });

    it('should not modify options for staff', async () => {
      const service = new InquiryService();
      const options = { limit: 10 };
      const result = await (
        service as InquiryService & {
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
    it('should throw error if inquiry not found', async () => {
      mockInquiryRepository.findById.mockResolvedValue(null);

      const service = new InquiryService();
      await expect(
        (
          service as InquiryService & {
            validateDelete: (context: ServiceContext, id: string) => Promise<void>;
          }
        ).validateDelete(mockStaffContext, 'non-existent')
      ).rejects.toThrow(ValidationError);
    });

    it('should throw error if inquiry is not in NEW status', async () => {
      mockInquiryRepository.findById.mockResolvedValue(mockAcceptedInquiry);

      const service = new InquiryService();
      await expect(
        (
          service as InquiryService & {
            validateDelete: (context: ServiceContext, id: string) => Promise<void>;
          }
        ).validateDelete(mockStaffContext, 'inquiry-2')
      ).rejects.toThrow(ValidationError);
    });

    it('should allow deletion if inquiry is in NEW status', async () => {
      mockInquiryRepository.findById.mockResolvedValue(mockInquiry);

      const service = new InquiryService();
      await expect(
        (
          service as InquiryService & {
            validateDelete: (context: ServiceContext, id: string) => Promise<void>;
          }
        ).validateDelete(mockStaffContext, 'inquiry-1')
      ).resolves.not.toThrow();
    });
  });
});
