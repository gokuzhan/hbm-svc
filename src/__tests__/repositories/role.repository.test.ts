import { RoleRepository } from '../../lib/repositories/role.repository';

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

// Mock the database connection
jest.mock('../../lib/db/connection', () => ({
  db: {},
}));

describe('RoleRepository', () => {
  let roleRepository: RoleRepository;

  beforeEach(() => {
    roleRepository = new RoleRepository();
  });

  describe('instantiation', () => {
    it('should create an instance of RoleRepository', () => {
      expect(roleRepository).toBeInstanceOf(RoleRepository);
    });
  });

  describe('methods', () => {
    it('should have create method', () => {
      expect(typeof roleRepository.create).toBe('function');
    });

    it('should have findById method', () => {
      expect(typeof roleRepository.findById).toBe('function');
    });

    it('should have findAll method', () => {
      expect(typeof roleRepository.findAll).toBe('function');
    });

    it('should have update method', () => {
      expect(typeof roleRepository.update).toBe('function');
    });

    it('should have delete method', () => {
      expect(typeof roleRepository.delete).toBe('function');
    });

    it('should have findByName method', () => {
      expect(typeof roleRepository.findByName).toBe('function');
    });

    it('should have createRole method', () => {
      expect(typeof roleRepository.createRole).toBe('function');
    });

    it('should have addPermissions method', () => {
      expect(typeof roleRepository.addPermissions).toBe('function');
    });

    it('should have removePermissions method', () => {
      expect(typeof roleRepository.removePermissions).toBe('function');
    });

    it('should have getAllPermissions method', () => {
      expect(typeof roleRepository.getAllPermissions).toBe('function');
    });
  });
});
