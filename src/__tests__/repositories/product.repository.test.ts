import { ProductRepository } from '../../lib/repositories/product.repository';

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

// Mock the database connection
jest.mock('../../lib/db/connection', () => ({
  db: {}
}));

describe('ProductRepository', () => {
  let productRepository: ProductRepository;

  beforeEach(() => {
    productRepository = new ProductRepository();
  });

  describe('instantiation', () => {
    it('should create an instance of ProductRepository', () => {
      expect(productRepository).toBeInstanceOf(ProductRepository);
    });
  });

  describe('methods', () => {
    it('should have create method', () => {
      expect(typeof productRepository.create).toBe('function');
    });

    it('should have findById method', () => {
      expect(typeof productRepository.findById).toBe('function');
    });

    it('should have findAll method', () => {
      expect(typeof productRepository.findAll).toBe('function');
    });

    it('should have update method', () => {
      expect(typeof productRepository.update).toBe('function');
    });

    it('should have delete method', () => {
      expect(typeof productRepository.delete).toBe('function');
    });

    it('should have findBySku method', () => {
      expect(typeof productRepository.findBySku).toBe('function');
    });

    it('should have findByOrderType method', () => {
      expect(typeof productRepository.findByOrderType).toBe('function');
    });

    it('should have findVariableProducts method', () => {
      expect(typeof productRepository.findVariableProducts).toBe('function');
    });

    it('should have getProductVariants method', () => {
      expect(typeof productRepository.getProductVariants).toBe('function');
    });
  });
});
