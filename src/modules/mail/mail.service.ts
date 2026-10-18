import { Inject, Injectable, Logger } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';
import { mailConfig } from '../../config/mail.config.js';
import type { IMailConfig } from '../../config/interfaces/i-mail-config.js';
import {
  buildCredentialRow,
  buildEmailTemplate,
} from '../../common/utils/email-template.util.js';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;

  constructor(@Inject(mailConfig.KEY) private readonly config: IMailConfig) {
    this.transporter = createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: { user: this.config.user, pass: this.config.password },
    });
  }

  async sendWelcomeEmail(
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
      <p style="margin:0;color:#475467;font-size:14px;line-height:22px;">Please sign in and change your password as soon as possible.</p>`;

    await this.send(
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
    to: string,
    fullName: string,
    password: string,
  ): Promise<void> {
    const { appName } = this.config;
    const bodyHtml = `<p style="margin:0 0 20px;color:#475467;font-size:14px;line-height:22px;">The password for your ${appName} account (<strong>${to}</strong>) was just changed. Your new password is:</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eaecf0;border-radius:8px;overflow:hidden;margin-bottom:20px;">
        ${buildCredentialRow('Password', password)}
      </table>
      <p style="margin:0;color:#b42318;font-size:14px;line-height:22px;">If you did not request this change, contact an administrator immediately.</p>`;

    await this.send(
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

  // A stalled mail server should never block the request that triggered the email
  private async send(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.config.from,
        to,
        subject,
        html,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send email "${subject}" to ${to}: ${(error as Error).message}`,
      );
    }
  }
}
