import { CustomerRepository } from '@/lib/repositories/customer.repository';

// Mock dependencies
jest.mock('@/lib/db', () => ({ db: {} }));
jest.mock('@/lib/db/schema', () => ({ customers: {} }));
jest.mock('drizzle-orm', () => ({
  eq: jest.fn(), and: jest.fn(), or: jest.fn(), like: jest.fn(), asc: jest.fn(), desc: jest.fn(), count: jest.fn()
}));

describe('CustomerRepository', () => {
  let customerRepository: CustomerRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    customerRepository = new CustomerRepository();
  });

  describe('Repository Instantiation', () => {
    it('should create instance successfully', () => {
      expect(customerRepository).toBeInstanceOf(CustomerRepository);
      expect(customerRepository).toBeDefined();
    });

    it('should inherit from BaseService', () => {
      expect(customerRepository).toHaveProperty('logOperation');
      expect(customerRepository).toHaveProperty('logError');
    });
  });

  describe('Method Existence', () => {
    it('should have all required CRUD methods', () => {
      expect(typeof customerRepository.findById).toBe('function');
      expect(typeof customerRepository.findByEmail).toBe('function');
      expect(typeof customerRepository.create).toBe('function');
      expect(typeof customerRepository.update).toBe('function');
      expect(typeof customerRepository.delete).toBe('function');
      expect(typeof customerRepository.findAll).toBe('function');
    });

    it('should have customer-specific methods', () => {
      expect(typeof customerRepository.findByEmailWithAuth).toBe('function');
      expect(typeof customerRepository.createCustomer).toBe('function');
      expect(typeof customerRepository.updatePassword).toBe('function');
      expect(typeof customerRepository.verifyPassword).toBe('function');
    });
  });

  describe('Entity Name', () => {
    it('should have correct entity name', () => {
      expect(customerRepository['entityName']).toBe('Customer');
    });
  });
});
