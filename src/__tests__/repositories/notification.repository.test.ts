import { NotificationRepository } from '../../lib/repositories/notification.repository';

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

// Mock the database connection
jest.mock('../../lib/db/connection', () => ({
  db: {}
}));

describe('NotificationRepository', () => {
  let notificationRepository: NotificationRepository;

  beforeEach(() => {
    notificationRepository = new NotificationRepository();
  });

  describe('instantiation', () => {
    it('should create an instance of NotificationRepository', () => {
      expect(notificationRepository).toBeInstanceOf(NotificationRepository);
    });
  });

  describe('methods', () => {
    it('should have create method', () => {
      expect(typeof notificationRepository.create).toBe('function');
    });

    it('should have findById method', () => {
      expect(typeof notificationRepository.findById).toBe('function');
    });

    it('should have findAll method', () => {
      expect(typeof notificationRepository.findAll).toBe('function');
    });

    it('should have update method', () => {
      expect(typeof notificationRepository.update).toBe('function');
    });

    it('should have delete method', () => {
      expect(typeof notificationRepository.delete).toBe('function');
    });

    it('should have findByRecipient method', () => {
      expect(typeof notificationRepository.findByRecipient).toBe('function');
    });

    it('should have markAsRead method', () => {
      expect(typeof notificationRepository.markAsRead).toBe('function');
    });

    it('should have findByCustomerRecipient method', () => {
      expect(typeof notificationRepository.findByCustomerRecipient).toBe('function');
    });

    it('should have findUnreadByRecipient method', () => {
      expect(typeof notificationRepository.findUnreadByRecipient).toBe('function');
    });

    it('should have findUnreadByCustomerRecipient method', () => {
      expect(typeof notificationRepository.findUnreadByCustomerRecipient).toBe('function');
    });

    it('should have markAsUnread method', () => {
      expect(typeof notificationRepository.markAsUnread).toBe('function');
    });

    it('should have markAllAsReadForRecipient method', () => {
      expect(typeof notificationRepository.markAllAsReadForRecipient).toBe('function');
    });

    it('should have markAllAsReadForCustomerRecipient method', () => {
      expect(typeof notificationRepository.markAllAsReadForCustomerRecipient).toBe('function');
    });

    it('should have getUnreadCount method', () => {
      expect(typeof notificationRepository.getUnreadCount).toBe('function');
    });
  });
});
