// Email Template Engine
// HBM Service Layer - Template rendering with Mustache

import { logger } from '@/lib/api/logger';
import fs from 'fs';
import Mustache from 'mustache';
import path from 'path';

export interface TemplateData {
  [key: string]: unknown;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

class TemplateEngine {
  private templateCache = new Map<string, string>();
  private readonly templatesDir: string;

  constructor() {
    this.templatesDir = path.join(process.cwd(), 'src', 'lib', 'email', 'templates');
  }

  /**
   * Load template from file system
   * Now supports both .mustache files and legacy .html/.txt files
   */
  private async loadTemplate(templateName: string, format: 'html' | 'text'): Promise<string> {
    // Try .mustache first (preferred), then fall back to legacy extensions
    const extensions = format === 'html' ? ['mustache', 'html'] : ['txt'];

    for (const ext of extensions) {
      const cacheKey = `${templateName}.${ext}`;

      // Check cache first
      if (this.templateCache.has(cacheKey)) {
        return this.templateCache.get(cacheKey)!;
      }

      try {
        const templatePath = path.join(this.templatesDir, `${templateName}.${ext}`);
        const templateContent = await fs.promises.readFile(templatePath, 'utf-8');

        // Cache the template content
        this.templateCache.set(cacheKey, templateContent);

        logger.info('Template loaded', {
          templateName,
          extension: ext,
          format,
          path: templatePath,
        });

        return templateContent;
      } catch (error) {
        // Continue to next extension if file not found
        if (ext === extensions[extensions.length - 1]) {
          logger.error('Failed to load template', {
            templateName,
            format,
            extensions,
            error,
          });
          throw new Error(
            `Failed to load template: ${templateName} (tried extensions: ${extensions.join(', ')})`
          );
        }
      }
    }

    throw new Error(`Failed to load template: ${templateName}`);
  }

  /**
   * Render a template with data using Mustache
   */
  async renderTemplate(
    templateName: string,
    data: TemplateData,
    subject: string
  ): Promise<EmailTemplate> {
    try {
      // Load HTML and text templates
      const [htmlTemplate, textTemplate] = await Promise.all([
        this.loadTemplate(templateName, 'html'),
        this.loadTemplate(templateName, 'text'),
      ]);

      // Prepare template data with helpers for Mustache
      const templateData = {
        ...data,
        subject,
        year: new Date().getFullYear(),
        timestamp: new Date().toISOString(),
        // Simple helper for current date formatting
        currentDate: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        currentDateTime: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      // Render both versions using Mustache
      const html = Mustache.render(htmlTemplate, templateData);
      const text = Mustache.render(textTemplate, templateData);

      logger.info('Template rendered successfully', {
        templateName,
        dataKeys: Object.keys(data),
      });

      return {
        subject,
        html,
        text,
      };
    } catch (error) {
      logger.error('Failed to render template', {
        templateName,
        error,
      });
      throw new Error(`Failed to render template: ${templateName}`);
    }
  }

  /**
   * Clear template cache (useful for development)
   */
  clearCache(): void {
    this.templateCache.clear();
    logger.info('Template cache cleared');
  }

  /**
   * Preload all templates into cache
   */
  async preloadTemplates(): Promise<void> {
    try {
      const templateFiles = await fs.promises.readdir(this.templatesDir);
      const templateNames = new Set<string>();

      // Extract unique template names
      for (const file of templateFiles) {
        if (file.endsWith('.mustache') || file.endsWith('.html') || file.endsWith('.txt')) {
          const name = file.replace(/\.(mustache|html|txt)$/, '');
          templateNames.add(name);
        }
      }

      // Preload all templates
      const preloadPromises: Promise<string>[] = [];
      for (const templateName of templateNames) {
        preloadPromises.push(
          this.loadTemplate(templateName, 'html'),
          this.loadTemplate(templateName, 'text')
        );
      }

      await Promise.all(preloadPromises);

      logger.info('All templates preloaded', {
        templateCount: templateNames.size,
        cacheSize: this.templateCache.size,
      });
    } catch (error) {
      logger.error('Failed to preload templates', { error });
    }
  }

  /**
   * Check if templates directory exists and is accessible
   */
  async validateTemplatesDirectory(): Promise<boolean> {
    try {
      await fs.promises.access(this.templatesDir, fs.constants.R_OK);
      const stats = await fs.promises.stat(this.templatesDir);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Get available templates
   */
  async getAvailableTemplates(): Promise<string[]> {
    try {
      const files = await fs.promises.readdir(this.templatesDir);
      const templates = new Set<string>();

      for (const file of files) {
        if (file.endsWith('.mustache') || file.endsWith('.html') || file.endsWith('.txt')) {
          const name = file.replace(/\.(mustache|html|txt)$/, '');
          templates.add(name);
        }
      }

      return Array.from(templates).sort();
    } catch (error) {
      logger.error('Failed to get available templates', { error });
      return [];
    }
  }
}

// Export singleton instance
export const templateEngine = new TemplateEngine();

// Export specific template rendering functions
export async function renderInquiryConfirmation(data: {
  customerName: string;
  inquiryId: string;
}): Promise<EmailTemplate> {
  return templateEngine.renderTemplate(
    'inquiry-confirmation',
    data,
    'Thank you for your inquiry - HBM Service'
  );
}

export async function renderInquiryNotification(data: {
  inquiryId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  companyName?: string;
  orderType?: string;
  submittedAt?: string;
}): Promise<EmailTemplate> {
  return templateEngine.renderTemplate(
    'inquiry-notification',
    {
      ...data,
      submittedAt: data.submittedAt || new Date().toLocaleString(),
    },
    `New Inquiry Received - ${data.inquiryId}`
  );
}
