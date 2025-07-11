import { MediaRepository } from '../../lib/repositories/media.repository';

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

// Mock the database connection
jest.mock('../../lib/db/connection', () => ({
  db: {}
}));

describe('MediaRepository', () => {
  let mediaRepository: MediaRepository;

  beforeEach(() => {
    mediaRepository = new MediaRepository();
  });

  describe('instantiation', () => {
    it('should create an instance of MediaRepository', () => {
      expect(mediaRepository).toBeInstanceOf(MediaRepository);
    });
  });

  describe('methods', () => {
    it('should have create method', () => {
      expect(typeof mediaRepository.create).toBe('function');
    });

    it('should have findById method', () => {
      expect(typeof mediaRepository.findById).toBe('function');
    });

    it('should have findAll method', () => {
      expect(typeof mediaRepository.findAll).toBe('function');
    });

    it('should have update method', () => {
      expect(typeof mediaRepository.update).toBe('function');
    });

    it('should have delete method', () => {
      expect(typeof mediaRepository.delete).toBe('function');
    });

    it('should have createMedia method', () => {
      expect(typeof mediaRepository.createMedia).toBe('function');
    });

    it('should have findByFileName method', () => {
      expect(typeof mediaRepository.findByFileName).toBe('function');
    });

    it('should have findByUploader method', () => {
      expect(typeof mediaRepository.findByUploader).toBe('function');
    });

    it('should have findByMimeType method', () => {
      expect(typeof mediaRepository.findByMimeType).toBe('function');
    });

    it('should have getTotalFileSize method', () => {
      expect(typeof mediaRepository.getTotalFileSize).toBe('function');
    });
  });
});
