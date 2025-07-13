// Email Service - Handles all email notifications
// HBM Service Layer - Email notification system with template support

import { logger } from '@/lib/api/logger';
import {
  renderInquiryConfirmation,
  renderInquiryNotification,
  templateEngine,
} from '@/lib/email/template-engine';
import { env } from '@/lib/env';
import { ServiceError } from '@/lib/errors';
import nodemailer from 'nodemailer';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

interface SendEmailOptions {
  to: string;
  template: EmailTemplate;
  from?: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private readonly fromEmail: string;

  constructor() {
    this.fromEmail = env.EMAIL_FROM;
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    try {
      // Check if email is configured
      if (!env.EMAIL_HOST || !env.EMAIL_USER || !env.EMAIL_PASS) {
        logger.warn('Email configuration not found, email service disabled');
        return;
      }

      const config: EmailConfig = {
        host: env.EMAIL_HOST,
        port: env.EMAIL_PORT,
        secure: env.EMAIL_SECURE,
        auth: {
          user: env.EMAIL_USER,
          pass: env.EMAIL_PASS,
        },
      };

      this.transporter = nodemailer.createTransport(config);

      logger.info('Email service initialized successfully', {
        host: config.host,
        port: config.port,
        secure: config.secure,
      });
    } catch (error) {
      logger.error('Failed to initialize email service', { error });
      this.transporter = null;
    }
  }

  async sendEmail(options: SendEmailOptions): Promise<void> {
    if (!this.transporter) {
      logger.warn('Email service not configured, skipping email send', {
        to: options.to,
        subject: options.template.subject,
      });
      return;
    }

    try {
      const mailOptions = {
        from: options.from || this.fromEmail,
        to: options.to,
        subject: options.template.subject,
        html: options.template.html,
        text: options.template.text,
      };

      const info = await this.transporter.sendMail(mailOptions);

      logger.info('Email sent successfully', {
        to: options.to,
        subject: options.template.subject,
        messageId: info.messageId,
      });
    } catch (error) {
      logger.error('Failed to send email', {
        to: options.to,
        subject: options.template.subject,
        error,
      });
      throw new ServiceError('Failed to send email notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        to: options.to,
      });
    }
  } /**
   * Send inquiry confirmation email to customer
   */
  async sendInquiryConfirmation(
    customerEmail: string,
    customerName: string,
    inquiryId: string
  ): Promise<void> {
    const template = await renderInquiryConfirmation({
      customerName,
      inquiryId,
    });

    await this.sendEmail({
      to: customerEmail,
      template,
    });
  }

  /**
   * Send inquiry notification to internal team
   */
  async sendInquiryNotification(
    inquiryId: string,
    customerName: string,
    customerEmail: string,
    orderType?: string,
    customerPhone?: string,
    companyName?: string
  ): Promise<void> {
    const template = await renderInquiryNotification({
      inquiryId,
      customerName,
      customerEmail,
      customerPhone,
      companyName,
      orderType,
      submittedAt: new Date().toLocaleString(),
    });

    await this.sendEmail({
      to: env.INQUIRY_NOTIFICATION_EMAIL,
      template,
    });
  }

  /**
   * Initialize template engine and preload templates
   */
  async initializeTemplates(): Promise<void> {
    try {
      await templateEngine.preloadTemplates();
      logger.info('Email templates initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize email templates', { error });
    }
  }

  /**
   * Verify email service configuration
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      logger.info('Email service connection verified');
      return true;
    } catch (error) {
      logger.error('Email service connection failed', { error });
      return false;
    }
  }

  /**
   * Get email service status
   */
  getStatus(): {
    configured: boolean;
    fromEmail: string;
    host?: string;
    port?: number;
  } {
    return {
      configured: this.transporter !== null,
      fromEmail: this.fromEmail,
      host: env.EMAIL_HOST,
      port: env.EMAIL_PORT,
    };
  }
}

// Export singleton instance
export const emailService = new EmailService();
