import { Inject, Injectable, Logger } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';
import PQueue from 'p-queue';
import { mailConfig } from '../../config/mail.config.js';
import type { IMailConfig } from '../../config/interfaces/i-mail-config.js';
import {
  buildCredentialRow,
  buildEmailButton,
  buildEmailTemplate,
} from '../../common/utils/email-template.util.js';
import { decryptSecret } from '../../common/utils/encryption.util.js';
import type { IMailSender } from './interfaces/i-mail-sender.js';
import { MailRepository } from './mail.repository.js';

// A throttled/unreachable SMTP host must fail fast, not hang a background send indefinitely
const SMTP_CONNECTION_TIMEOUT_MS = 10_000;
const SMTP_GREETING_TIMEOUT_MS = 10_000;
const SMTP_SOCKET_TIMEOUT_MS = 20_000;

// Caps simultaneous SMTP connections so a bulk run (e.g. monthly rent) can't flood/throttle the mail host
const SMTP_MAX_CONCURRENT_SENDS = 5;

// Shown as the sender for super admin mail so recipients don't see the env account's personal address
const SUPER_ADMIN_SENDER_NAME = 'MIFA Alliance';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly queue = new PQueue({ concurrency: SMTP_MAX_CONCURRENT_SENDS });

  constructor(
    @Inject(mailConfig.KEY) private readonly config: IMailConfig,
    private readonly mailRepository: MailRepository,
  ) {}

  // The env account, used for anything the super admin triggers
  getPlatformSender(): IMailSender {
    return {
      user: this.config.user,
      password: this.config.password,
      from: this.config.from,
      name: SUPER_ADMIN_SENDER_NAME,
    };
  }

  // No company sends from the env account; otherwise the company's own email and password
  async resolveSender(companyId: string | null): Promise<IMailSender | null> {
    if (!companyId) {
      return this.getPlatformSender();
    }

    try {
      const company = await this.mailRepository.findCompanyCredentials(companyId);

      if (!company?.email || !company.mailPassword) {
        this.logger.warn(
          `Company "${company?.name ?? companyId}" has no email or mail password set — skipping its emails. Set both on the company to enable them.`,
        );
        return null;
      }

      return {
        user: company.email,
        password: decryptSecret(company.mailPassword, this.config.encryptionKey),
        from: company.email,
        name: company.name,
      };
    } catch (error) {
      this.logger.error(
        `Could not load mail credentials for company ${companyId}: ${(error as Error).message}. Re-save the company's mail password if MAIL_ENCRYPTION_KEY changed.`,
      );
      return null;
    }
  }

  async sendWelcomeEmail(
    sender: IMailSender | null,
    to: string,
    fullName: string,
    password: string,
  ): Promise<void> {
    const { appName } = this.config;
    const bodyHtml = `<p style="margin:0 0 20px;color:#475467;font-size:14px;line-height:22px;">Your ${appName} account has been created. Here are your login details:</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eaecf0;border-radius:8px;overflow:hidden;margin-bottom:20px;">
        ${buildCredentialRow('Email', to)}
        ${buildCredentialRow('Password', password)}
      </table>
      ${buildEmailButton(`Sign in to ${appName}`, this.config.frontendUrl)}
      <p style="margin:0;color:#475467;font-size:14px;line-height:22px;">Please sign in and change your password as soon as possible.</p>`;

    await this.send(
      sender,
      to,
      `Welcome to ${appName} — your account details`,
      buildEmailTemplate({
        appName,
        title: `Welcome to ${appName}`,
        greetingName: fullName,
        bodyHtml,
      }),
    );
  }

  async sendPasswordChangedEmail(
    sender: IMailSender | null,
    to: string,
    fullName: string,
    password: string,
  ): Promise<void> {
    const { appName } = this.config;
    const bodyHtml = `<p style="margin:0 0 20px;color:#475467;font-size:14px;line-height:22px;">The password for your ${appName} account (<strong>${to}</strong>) was just changed. Your new password is:</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eaecf0;border-radius:8px;overflow:hidden;margin-bottom:20px;">
        ${buildCredentialRow('Password', password)}
      </table>
      ${buildEmailButton(`Sign in to ${appName}`, this.config.frontendUrl)}
      <p style="margin:0;color:#b42318;font-size:14px;line-height:22px;">If you did not request this change, contact an administrator immediately.</p>`;

    await this.send(
      sender,
      to,
      `Your ${appName} password has been changed`,
      buildEmailTemplate({
        appName,
        title: 'Password Changed',
        greetingName: fullName,
        bodyHtml,
      }),
    );
  }

  async sendMonthlyRentInvoiceEmail(
    sender: IMailSender | null,
    to: string,
    tenantName: string,
    propertyName: string,
    propertyNumber: string,
    amount: string,
    monthLabel: string,
    description: string,
    dueDate: string,
  ): Promise<void> {
    const formattedAmount = Number(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const formattedDueDate = new Date(`${dueDate}T00:00:00Z`).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });

    const bodyHtml = `<p style="margin:0 0 20px;color:#475467;font-size:14px;line-height:22px;">Your rent invoice for <strong>${monthLabel}</strong> has been generated. Here are the details:</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eaecf0;border-radius:8px;overflow:hidden;margin-bottom:20px;">
        ${buildCredentialRow('Property', propertyName)}
        ${buildCredentialRow('Property No.', propertyNumber)}
        ${buildCredentialRow('Billing Period', monthLabel)}
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eaecf0;border-radius:8px;overflow:hidden;margin-bottom:20px;">
        <tr>
          <td style="padding:10px 16px;background-color:#f9fafb;color:#667085;font-size:12px;font-weight:600;text-transform:uppercase;">Description</td>
          <td style="padding:10px 16px;background-color:#f9fafb;color:#667085;font-size:12px;font-weight:600;text-transform:uppercase;">Due Date</td>
          <td style="padding:10px 16px;background-color:#f9fafb;color:#667085;font-size:12px;font-weight:600;text-transform:uppercase;text-align:right;">Amount</td>
        </tr>
        <tr>
          <td style="padding:10px 16px;color:#101828;font-size:13px;">${description}</td>
          <td style="padding:10px 16px;color:#101828;font-size:13px;">${formattedDueDate}</td>
          <td style="padding:10px 16px;color:#101828;font-size:13px;font-weight:600;text-align:right;">PKR ${formattedAmount}</td>
        </tr>
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:10px;margin-bottom:20px;">
        <tr>
          <td style="padding:20px 24px;">
            <p style="margin:0 0 4px;color:#e0e7ff;font-size:12px;letter-spacing:0.4px;text-transform:uppercase;">Amount Due</p>
            <p style="margin:0;color:#ffffff;font-size:28px;font-weight:700;">PKR ${formattedAmount}</p>
          </td>
        </tr>
      </table>
      <p style="margin:0;color:#475467;font-size:14px;line-height:22px;">Please make sure your payment is settled by the due date to avoid late fees.</p>`;

    await this.send(
      sender,
      to,
      `Rent Invoice — ${propertyName} — ${monthLabel}`,
      buildEmailTemplate({
        appName: this.config.appName,
        title: 'Monthly Rent Invoice',
        greetingName: tenantName,
        bodyHtml,
      }),
    );
  }

  // A stalled mail server should never block the request that triggered the email
  private async send(
    sender: IMailSender | null,
    to: string,
    subject: string,
    html: string,
  ): Promise<void> {
    // resolveSender already logged why there is no sender
    if (!sender) {
      return;
    }

    try {
      await this.queue.add(() =>
        this.createTransporter(sender).sendMail({
          from: { name: sender.name, address: sender.from },
          to,
          subject,
          html,
        }),
      );
      this.logger.log(`Sent email "${subject}" to ${to}`);
    } catch (error) {
      this.logger.error(
        `Failed to send email "${subject}" to ${to} from ${sender.from}: ${(error as Error).message}`,
      );
    }
  }

  // Unpooled, so a transporter is just config — each sendMail opens its own connection anyway
  private createTransporter(sender: IMailSender): Transporter {
    return createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: { user: sender.user, pass: sender.password },
      connectionTimeout: SMTP_CONNECTION_TIMEOUT_MS,
      greetingTimeout: SMTP_GREETING_TIMEOUT_MS,
      socketTimeout: SMTP_SOCKET_TIMEOUT_MS,
    });
  }
}
