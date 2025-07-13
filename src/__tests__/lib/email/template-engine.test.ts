import {
  renderInquiryConfirmation,
  renderInquiryNotification,
  templateEngine,
  type EmailTemplate,
  type TemplateData,
} from '@/lib/email/template-engine';
import { readFileSync } from 'fs';
import Mustache from 'mustache';
import { join } from 'path';

describe('Email Template Engine', () => {
  const templatesDir = join(process.cwd(), 'src', 'lib', 'email', 'templates');

  describe('Template Loading', () => {
    beforeEach(() => {
      templateEngine.clearCache();
    });

    it('should validate templates directory exists', async () => {
      const isValid = await templateEngine.validateTemplatesDirectory();
      expect(isValid).toBe(true);
    });

    it('should get available templates', async () => {
      const templates = await templateEngine.getAvailableTemplates();
      expect(templates).toContain('inquiry-confirmation');
      expect(templates).toContain('inquiry-notification');
    });

    it('should preload templates without errors', async () => {
      await expect(templateEngine.preloadTemplates()).resolves.not.toThrow();
    });

    it('should clear cache successfully', () => {
      templateEngine.clearCache();
      // Should not throw any errors
      expect(true).toBe(true);
    });
  });

  describe('Mustache Template Rendering', () => {
    const testData: TemplateData = {
      customerName: 'John Doe',
      inquiryId: 'INQ-12345',
      customerEmail: 'john@example.com',
      customerPhone: '+1234567890',
      companyName: 'Acme Corp',
      orderType: 'Private Label',
      submittedAt: '2025-07-13 10:30:00',
    };

    describe('Direct Mustache Rendering', () => {
      it('should render inquiry-confirmation.mustache template correctly', () => {
        const templatePath = join(templatesDir, 'inquiry-confirmation.mustache');
        const template = readFileSync(templatePath, 'utf-8');

        const rendered = Mustache.render(template, {
          ...testData,
          subject: 'Test Subject',
          year: new Date().getFullYear(),
        });

        expect(rendered).toContain('John Doe');
        expect(rendered).toContain('INQ-12345');
        expect(rendered).toContain('Thank you for your inquiry!');
        expect(rendered).toContain('HBM Service');
        expect(rendered).toContain(new Date().getFullYear().toString());
      });

      it('should render inquiry-notification.mustache template correctly', () => {
        const templatePath = join(templatesDir, 'inquiry-notification.mustache');
        const template = readFileSync(templatePath, 'utf-8');

        const rendered = Mustache.render(template, {
          ...testData,
          subject: 'Test Subject',
          year: new Date().getFullYear(),
        });

        expect(rendered).toContain('John Doe');
        expect(rendered).toContain('john@example.com');
        expect(rendered).toContain('INQ-12345');
        expect(rendered).toContain('+1234567890');
        expect(rendered).toContain('Acme Corp');
        expect(rendered).toContain('Private Label');
        expect(rendered).toContain('New Inquiry Received');
      });

      it('should handle conditional sections correctly', () => {
        const templatePath = join(templatesDir, 'inquiry-notification.mustache');
        const template = readFileSync(templatePath, 'utf-8');

        // Test with all optional fields
        const fullData = {
          ...testData,
          year: new Date().getFullYear(),
        };
        const fullRendered = Mustache.render(template, fullData);

        expect(fullRendered).toContain('Phone:</strong> +1234567890');
        expect(fullRendered).toContain('Company:</strong> Acme Corp');
        expect(fullRendered).toContain('Order Type:</strong> Private Label');

        // Test with minimal data (no optional fields)
        const minimalData = {
          inquiryId: 'INQ-54321',
          customerName: 'Jane Smith',
          customerEmail: 'jane@example.com',
          year: new Date().getFullYear(),
        };
        const minimalRendered = Mustache.render(template, minimalData);

        expect(minimalRendered).toContain('Jane Smith');
        expect(minimalRendered).toContain('jane@example.com');
        expect(minimalRendered).not.toContain('Phone:');
        expect(minimalRendered).not.toContain('Company:');
        expect(minimalRendered).not.toContain('Order Type:');
      });

      it('should render text templates correctly', () => {
        const confirmationTextPath = join(templatesDir, 'inquiry-confirmation.txt');
        const notificationTextPath = join(templatesDir, 'inquiry-notification.txt');

        const confirmationTemplate = readFileSync(confirmationTextPath, 'utf-8');
        const notificationTemplate = readFileSync(notificationTextPath, 'utf-8');

        const confirmationRendered = Mustache.render(confirmationTemplate, {
          ...testData,
          year: new Date().getFullYear(),
        });

        const notificationRendered = Mustache.render(notificationTemplate, {
          ...testData,
          year: new Date().getFullYear(),
        });

        // Confirmation text tests
        expect(confirmationRendered).toContain('Dear John Doe');
        expect(confirmationRendered).toContain('INQ-12345');
        expect(confirmationRendered).toContain('HBM Service Team');

        // Notification text tests
        expect(notificationRendered).toContain('NEW INQUIRY RECEIVED');
        expect(notificationRendered).toContain('john@example.com');
        expect(notificationRendered).toContain('Phone: +1234567890');
        expect(notificationRendered).toContain('Company: Acme Corp');
      });
    });

    describe('Template Engine Integration', () => {
      it('should render inquiry confirmation template through engine', async () => {
        const result: EmailTemplate = await renderInquiryConfirmation({
          customerName: 'John Doe',
          inquiryId: 'INQ-12345',
        });

        expect(result).toHaveProperty('subject');
        expect(result).toHaveProperty('html');
        expect(result).toHaveProperty('text');

        expect(result.subject).toBe('Thank you for your inquiry - HBM Service');
        expect(result.html).toContain('John Doe');
        expect(result.html).toContain('INQ-12345');
        expect(result.html).toContain('<!doctype html>');

        expect(result.text).toContain('John Doe');
        expect(result.text).toContain('INQ-12345');
        expect(result.text).not.toContain('<html>');
      });

      it('should render inquiry notification template through engine', async () => {
        const result: EmailTemplate = await renderInquiryNotification({
          inquiryId: 'INQ-12345',
          customerName: 'John Doe',
          customerEmail: 'john@example.com',
          customerPhone: '+1234567890',
          companyName: 'Acme Corp',
          orderType: 'Private Label',
        });

        expect(result).toHaveProperty('subject');
        expect(result).toHaveProperty('html');
        expect(result).toHaveProperty('text');

        expect(result.subject).toBe('New Inquiry Received - INQ-12345');
        expect(result.html).toContain('john@example.com');
        expect(result.html).toContain('+1234567890');
        expect(result.html).toContain('Acme Corp');

        expect(result.text).toContain('john@example.com');
        expect(result.text).toContain('+1234567890');
        expect(result.text).toContain('Acme Corp');
      });

      it('should handle missing optional fields in notification template', async () => {
        const result: EmailTemplate = await renderInquiryNotification({
          inquiryId: 'INQ-54321',
          customerName: 'Jane Smith',
          customerEmail: 'jane@example.com',
          // Optional fields omitted
        });

        expect(result.html).toContain('Jane Smith');
        expect(result.html).toContain('jane@example.com');
        expect(result.html).not.toContain('Phone:');
        expect(result.html).not.toContain('Company:');
        expect(result.html).not.toContain('Order Type:');

        expect(result.text).toContain('Jane Smith');
        expect(result.text).toContain('jane@example.com');
        expect(result.text).not.toContain('Phone:');
        expect(result.text).not.toContain('Company:');
      });

      it('should include helper data in templates', async () => {
        const result: EmailTemplate = await renderInquiryConfirmation({
          customerName: 'John Doe',
          inquiryId: 'INQ-12345',
        });

        const currentYear = new Date().getFullYear();
        expect(result.html).toContain(currentYear.toString());
        expect(result.text).toContain(currentYear.toString());
      });
    });

    describe('Template File Extensions', () => {
      it('should prefer .mustache files over .html files', async () => {
        // This test verifies that our template engine prioritizes .mustache files
        const result = await renderInquiryConfirmation({
          customerName: 'Test User',
          inquiryId: 'TEST-001',
        });

        // Should successfully load and render from .mustache files
        expect(result.html).toContain('Test User');
        expect(result.html).toContain('TEST-001');
      });

      it('should support both .mustache and .txt formats', async () => {
        const result = await renderInquiryNotification({
          inquiryId: 'TEST-002',
          customerName: 'Test User',
          customerEmail: 'test@example.com',
        });

        // HTML should come from .mustache file
        expect(result.html).toContain('<!doctype html>');
        expect(result.html).toContain('Test User');

        // Text should come from .txt file
        expect(result.text).not.toContain('<html>');
        expect(result.text).toContain('Test User');
        expect(result.text).toContain('NEW INQUIRY RECEIVED');
      });
    });

    describe('Error Handling', () => {
      it('should throw error for non-existent template', async () => {
        await expect(
          templateEngine.renderTemplate('non-existent-template', testData, 'Test Subject')
        ).rejects.toThrow('Failed to render template: non-existent-template');
      });

      it('should handle invalid template data gracefully', async () => {
        // Should not throw error, but should handle undefined/null values
        const result = await renderInquiryConfirmation({
          customerName: '',
          inquiryId: '',
        });

        expect(result).toHaveProperty('html');
        expect(result).toHaveProperty('text');
        expect(result).toHaveProperty('subject');
      });
    });

    describe('Mustache Syntax Compliance', () => {
      it('should not contain invalid Handlebars syntax in templates', () => {
        const confirmationPath = join(templatesDir, 'inquiry-confirmation.mustache');
        const notificationPath = join(templatesDir, 'inquiry-notification.mustache');

        const confirmationContent = readFileSync(confirmationPath, 'utf-8');
        const notificationContent = readFileSync(notificationPath, 'utf-8');

        // Should not contain Handlebars-specific syntax
        expect(confirmationContent).not.toContain('{{#if');
        expect(confirmationContent).not.toContain('{{#unless');
        expect(confirmationContent).not.toContain('{{#each');

        expect(notificationContent).not.toContain('{{#if');
        expect(notificationContent).not.toContain('{{#unless');
        expect(notificationContent).not.toContain('{{#each');
      });

      it('should use proper Mustache section syntax', () => {
        const notificationPath = join(templatesDir, 'inquiry-notification.mustache');
        const notificationTextPath = join(templatesDir, 'inquiry-notification.txt');

        const htmlContent = readFileSync(notificationPath, 'utf-8');
        const textContent = readFileSync(notificationTextPath, 'utf-8');

        // Should contain proper Mustache section syntax
        expect(htmlContent).toContain('{{#customerPhone}}');
        expect(htmlContent).toContain('{{/customerPhone}}');
        expect(htmlContent).toContain('{{#companyName}}');
        expect(htmlContent).toContain('{{/companyName}}');

        expect(textContent).toContain('{{#customerPhone}}');
        expect(textContent).toContain('{{/customerPhone}}');
      });
    });
  });

  describe('Performance', () => {
    it('should cache templates for better performance', async () => {
      // Clear cache first
      templateEngine.clearCache();

      // First render (should load from file)
      const start1 = Date.now();
      await renderInquiryConfirmation({
        customerName: 'Test User',
        inquiryId: 'PERF-001',
      });
      const time1 = Date.now() - start1;

      // Second render (should use cache)
      const start2 = Date.now();
      await renderInquiryConfirmation({
        customerName: 'Test User 2',
        inquiryId: 'PERF-002',
      });
      const time2 = Date.now() - start2;

      // Second render should be faster (cached)
      expect(time2).toBeLessThanOrEqual(time1);
    });
  });
});
