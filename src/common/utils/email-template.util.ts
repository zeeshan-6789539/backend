import type { IEmailTemplateOptions } from '../interfaces/i-email-template-options.js';

const POWERED_BY_TEXT = 'Powered by MIFA Alliance';

// Shared modern HTML wrapper so every transactional email looks consistent
export function buildEmailTemplate(options: IEmailTemplateOptions): string {
  const { appName, title, greetingName, bodyHtml, footerNote } = options;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f5f7;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(16,24,40,0.08);">
            <tr>
              <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:28px 32px;">
                <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:600;">${appName}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 16px;color:#101828;font-size:16px;">Hi ${greetingName},</p>
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background-color:#f9fafb;border-top:1px solid #eaecf0;">
                <p style="margin:0;color:#667085;font-size:12px;">${footerNote ?? 'This is an automated message, please do not reply to this email.'}</p>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0;color:#98a2b3;font-size:12px;text-align:center;">${POWERED_BY_TEXT}</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function buildEmailButton(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
    <tr>
      <td style="border-radius:8px;background:linear-gradient(135deg,#4f46e5,#7c3aed);">
        <a href="${url}" target="_blank" rel="noopener" style="display:inline-block;padding:12px 24px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">${label}</a>
      </td>
    </tr>
  </table>
  <p style="margin:0 0 20px;color:#667085;font-size:12px;line-height:18px;">Or open this link: <a href="${url}" target="_blank" rel="noopener" style="color:#4f46e5;word-break:break-all;">${url}</a></p>`;
}

export function buildCredentialRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:10px 16px;color:#667085;font-size:13px;">${label}</td>
    <td style="padding:10px 16px;color:#101828;font-size:14px;font-weight:600;text-align:right;">${value}</td>
  </tr>`;
}
