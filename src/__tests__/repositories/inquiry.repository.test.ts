import { InquiryRepository } from '../../lib/repositories/inquiry.repository';

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

// Mock the database connection
jest.mock('../../lib/db/connection', () => ({
  db: {},
}));

describe('InquiryRepository', () => {
  let inquiryRepository: InquiryRepository;

  beforeEach(() => {
    inquiryRepository = new InquiryRepository();
  });

  describe('instantiation', () => {
    it('should create an instance of InquiryRepository', () => {
      expect(inquiryRepository).toBeInstanceOf(InquiryRepository);
    });
  });

  describe('methods', () => {
    it('should have create method', () => {
      expect(typeof inquiryRepository.create).toBe('function');
    });

    it('should have findById method', () => {
      expect(typeof inquiryRepository.findById).toBe('function');
    });

    it('should have findAll method', () => {
      expect(typeof inquiryRepository.findAll).toBe('function');
    });

    it('should have update method', () => {
      expect(typeof inquiryRepository.update).toBe('function');
    });

    it('should have delete method', () => {
      expect(typeof inquiryRepository.delete).toBe('function');
    });

    it('should have updateInquiryStatus method', () => {
      expect(typeof inquiryRepository.updateInquiryStatus).toBe('function');
    });

    it('should have assignInquiry method', () => {
      expect(typeof inquiryRepository.assignInquiry).toBe('function');
    });

    it('should have getInquiryStatusHistory method', () => {
      expect(typeof inquiryRepository.getInquiryStatusHistory).toBe('function');
    });
  });
});
