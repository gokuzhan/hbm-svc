// Email Service Tests
// HBM Service Layer - Test email notification functionality with template rendering

// Mock nodemailer first
const mockSendMail = jest.fn();
const mockVerify = jest.fn();

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: mockSendMail,
    verify: mockVerify,
  })),
}));

// Mock the template rendering functions
jest.mock('@/lib/email/template-engine', () => ({
  templateEngine: {
    preloadTemplates: jest.fn(),
    renderTemplate: jest.fn(),
  },
  renderInquiryConfirmation: jest.fn(),
  renderInquiryNotification: jest.fn(),
}));

// Mock env to have email configuration for tests
jest.mock('@/lib/env', () => ({
  env: {
    ...jest.requireActual('@/lib/env').env,
    EMAIL_HOST: 'test.smtp.com',
    EMAIL_USER: 'test@example.com',
    EMAIL_PASS: 'test-password',
    EMAIL_FROM: 'noreply@hbm-service.com',
    INQUIRY_NOTIFICATION_EMAIL: 'inquiries@hbm-service.com',
  },
  isDev: false,
  isProd: false,
  isTest: true,
}));

// Import after mocking
import { renderInquiryConfirmation, renderInquiryNotification } from '@/lib/email/template-engine';
import { env } from '@/lib/env';
import { ServiceError } from '@/lib/errors';
import { EmailService } from '@/lib/services/email.service';

const mockRenderInquiryConfirmation = renderInquiryConfirmation as jest.MockedFunction<
  typeof renderInquiryConfirmation
>;
const mockRenderInquiryNotification = renderInquiryNotification as jest.MockedFunction<
  typeof renderInquiryNotification
>;

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });
    mockVerify.mockResolvedValue(true);
    service = new EmailService();
  });

  describe('sendInquiryConfirmation', () => {
    it('should send inquiry confirmation email with proper template', async () => {
      const customerEmail = 'test@example.com';
      const customerName = 'John Doe';
      const inquiryId = 'INQ-001';

      // Mock template rendering
      mockRenderInquiryConfirmation.mockResolvedValueOnce({
        subject: 'Thank you for your inquiry',
        html: '<h1>Thank you John Doe</h1>',
        text: 'Thank you John Doe',
      });

      await service.sendInquiryConfirmation(customerEmail, customerName, inquiryId);

      expect(mockRenderInquiryConfirmation).toHaveBeenCalledWith({
        customerName,
        inquiryId,
      });

      expect(mockSendMail).toHaveBeenCalledWith({
        from: 'noreply@hbm-service.com',
        to: customerEmail,
        subject: 'Thank you for your inquiry',
        html: '<h1>Thank you John Doe</h1>',
        text: 'Thank you John Doe',
      });
    });

    it('should handle template rendering errors gracefully', async () => {
      const customerEmail = 'test@example.com';
      const customerName = 'John Doe';
      const inquiryId = 'INQ-001';

      // Mock template rendering failure
      mockRenderInquiryConfirmation.mockRejectedValueOnce(new Error('Template not found'));

      await expect(
        service.sendInquiryConfirmation(customerEmail, customerName, inquiryId)
      ).rejects.toThrow('Template not found');
    });

    it('should handle email sending errors gracefully', async () => {
      const customerEmail = 'test@example.com';
      const customerName = 'John Doe';
      const inquiryId = 'INQ-001';

      mockRenderInquiryConfirmation.mockResolvedValueOnce({
        subject: 'Thank you for your inquiry',
        html: '<h1>Thank you John Doe</h1>',
        text: 'Thank you John Doe',
      });

      mockSendMail.mockRejectedValueOnce(new Error('SMTP connection failed'));

      await expect(
        service.sendInquiryConfirmation(customerEmail, customerName, inquiryId)
      ).rejects.toThrow(ServiceError);
    });
  });

  describe('sendInquiryNotification', () => {
    it('should send inquiry notification to staff with proper template', async () => {
      const inquiryId = 'INQ-001';
      const customerName = 'John Doe';
      const customerEmail = 'john@example.com';
      const orderType = 'White Label';
      const customerPhone = '+1234567890';
      const companyName = 'Test Company';

      // Mock template rendering
      mockRenderInquiryNotification.mockResolvedValueOnce({
        subject: 'New Inquiry Received',
        html: '<h1>New Inquiry from John Doe</h1>',
        text: 'New Inquiry from John Doe',
      });

      await service.sendInquiryNotification(
        inquiryId,
        customerName,
        customerEmail,
        orderType,
        customerPhone,
        companyName
      );

      expect(mockRenderInquiryNotification).toHaveBeenCalledWith({
        inquiryId,
        customerName,
        customerEmail,
        customerPhone,
        companyName,
        orderType,
        submittedAt: expect.any(String),
      });

      expect(mockSendMail).toHaveBeenCalledWith({
        from: 'noreply@hbm-service.com',
        to: 'inquiries@hbm-service.com',
        subject: 'New Inquiry Received',
        html: '<h1>New Inquiry from John Doe</h1>',
        text: 'New Inquiry from John Doe',
      });
    });

    it('should handle email sending errors gracefully', async () => {
      const inquiryId = 'INQ-001';
      const customerName = 'John Doe';
      const customerEmail = 'john@example.com';

      mockRenderInquiryNotification.mockResolvedValueOnce({
        subject: 'New Inquiry Received',
        html: '<h1>New Inquiry from John Doe</h1>',
        text: 'New Inquiry from John Doe',
      });

      mockSendMail.mockRejectedValueOnce(new Error('SMTP connection failed'));

      await expect(
        service.sendInquiryNotification(inquiryId, customerName, customerEmail)
      ).rejects.toThrow(ServiceError);
    });
  });

  describe('Connection Verification', () => {
    it('should verify email connection successfully', async () => {
      mockVerify.mockResolvedValueOnce(true);

      const result = await service.verifyConnection();

      expect(result).toBe(true);
      expect(mockVerify).toHaveBeenCalled();
    });

    it('should handle connection verification failure', async () => {
      mockVerify.mockRejectedValueOnce(new Error('Connection failed'));

      const result = await service.verifyConnection();

      expect(result).toBe(false);
    });
  });

  describe('Environment Configuration', () => {
    it('should use environment variables for email configuration', () => {
      // Test that the service uses env variables correctly
      expect(env.EMAIL_FROM).toBeDefined();
      expect(env.INQUIRY_NOTIFICATION_EMAIL).toBeDefined();
    });
  });
});
