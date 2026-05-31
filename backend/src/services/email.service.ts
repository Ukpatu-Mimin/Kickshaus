import nodemailer from 'nodemailer';
import { config } from '../config/env';

/**
 * Service for handling email communications via SMTP
 */
export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    if (config.email.host && config.email.user && config.email.pass) {
      this.transporter = nodemailer.createTransport({
        host: config.email.host,
        port: config.email.port,
        secure: config.email.port === 465, // true for 465, false for other ports
        auth: {
          user: config.email.user,
          pass: config.email.pass,
        },
      });
      console.log(`[EmailService] SMTP Transporter initialized for ${config.email.host}`);
    } else {
      console.warn('[EmailService] SMTP not configured. Emails will be logged to console only.');
    }
  }

  /**
   * Helper to send email or log if not configured
   */
  private async sendEmail(to: string, subject: string, html: string): Promise<void> {
    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: `Kickshaus <${config.email.from}>`,
          to,
          subject,
          html,
        });
        console.log(`[EmailService] Sent email to ${to}: "${subject}"`);
      } catch (error) {
        console.error(`[EmailService] Failed to send email to ${to}:`, error);
        // Fallback to logging content in case of error
        this.logEmail(to, subject, html);
      }
    } else {
      this.logEmail(to, subject, html);
    }
  }

  private logEmail(to: string, subject: string, html: string) {
    console.log('=================================================================');
    console.log(`📨 [EmailService] SIMULATION - TO: ${to}`);
    console.log(`SUBJECT: ${subject}`);
    console.log(`HTML CONTENT (truncated): ${html.substring(0, 200)}...`);
    console.log('=================================================================');
  }
  
  /**
   * Send a password reset email
   */
  async sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
    const resetLink = `${config.social.frontendUrl}/reset-password.html?token=${resetToken}`;
    const subject = 'Reset Your Kickshaus Password';
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>You requested to reset your password. Click the link below to proceed:</p>
        <p><a href="${resetLink}" style="background: #00A8E8; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
        <p style="color: #666; font-size: 0.9em;">If you didn't request this, please ignore this email.</p>
      </div>
    `;

    await this.sendEmail(to, subject, html);
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmationEmail(
    to: string, 
    orderId: string, 
    items: any[], 
    total: number, 
    txHash?: string
  ): Promise<void> {
    const subject = `Order Confirmed - Kickshaus #${orderId.slice(0, 8)}`;
    
    const itemsList = items.map(item => 
      `<li style="margin-bottom: 5px;">
        <strong>${item.name || 'Product'}</strong> x ${item.quantity} - ₦${item.price.toLocaleString()}
       </li>`
    ).join('');

    const txSection = txHash 
      ? `<p><strong>Blockchain Receipt:</strong> <a href="https://solscan.io/tx/${txHash}">View on Solscan</a></p>` 
      : '';

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h1 style="color: #00A8E8;">Thank you for your order!</h1>
        <p>Your order <strong>#${orderId}</strong> has been confirmed and is being processed.</p>
        
        <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Order Summary</h3>
          <ul style="padding-left: 20px;">
            ${itemsList}
          </ul>
          <hr style="border: 0; border-top: 1px solid #ddd; margin: 15px 0;">
          <p style="font-size: 1.2em; font-weight: bold;">Total: ₦${total.toLocaleString()}</p>
        </div>

        ${txSection}

        <p>You can track your order status in your <a href="${config.social.frontendUrl}/dashboard.html">Dashboard</a>.</p>
      </div>
    `;

    await this.sendEmail(to, subject, html);
  }

  /**
   * Send a welcome email
   */
  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    const subject = 'Welcome to Kickshaus!';
    const html = `
      <h1>Welcome, ${name}!</h1>
      <p>We're excited to have you join the Kickshaus community.</p>
      <p>Start shopping for exclusive footwear today.</p>
    `;
    await this.sendEmail(to, subject, html);
  }
}

export const emailService = new EmailService();
