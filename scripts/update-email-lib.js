const fs = require('fs');

const code = `import nodemailer from 'nodemailer';
import { prisma } from './prisma';
import { decryptSecret } from './security';

export type EmailTemplateType =
  | 'WELCOME'
  | 'OTP_VERIFY'
  | 'COMPANY_WELCOME'
  | 'COMPANY_INVITE'
  | 'SUBSCRIPTION_ALERT'
  | 'PASSWORD_RESET'
  | 'PASSWORD_CHANGED'
  | 'LOGIN_ALERT'
  | 'ENROLLMENT'
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_FAILED'
  | 'CERTIFICATE'
  | 'SUPPORT'
  | 'ANNOUNCEMENT'
  | 'OFFER'
  | 'TEST_EMAIL'
  | 'NOTIFICATION';

export interface SmtpConfigData {
  smtpHost: string;
  smtpPort: number;
  smtpEncryption: 'NONE' | 'SSL' | 'TLS' | string;
  smtpUsername?: string;
  smtpPassword?: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string | null;
  authEnabled?: boolean;
}

export interface EmailOptions {
  to: string;
  subject: string;
  template: EmailTemplateType;
  data?: Record<string, any>;
  userId?: string | null;
  organizationId?: string | null;
  bypassFallback?: boolean;
}

export interface ResolvedSmtp {
  config: SmtpConfigData;
  providerType: 'ORGANIZATION_SMTP' | 'PLATFORM_SMTP' | 'ENV_SMTP' | 'GMAIL' | 'CONSOLE';
  isFallback: boolean;
}

/**
 * Generate Responsive Branded HTML Email
 */
export function renderEmailHtml(
  template: EmailTemplateType,
  data: Record<string, any> = {},
  branding?: { name?: string; logo?: string; primaryColor?: string }
): string {
  const brandPrimary = branding?.primaryColor || '#4f46e5';
  const brandDark = '#070913';
  const platformName = branding?.name || 'AADHYARA';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  let bodyContent = '';

  switch (template) {
    case 'TEST_EMAIL':
      bodyContent = \`
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 50%; width: 56px; height: 56px; line-height: 56px; font-size: 26px;">
            ✅
          </div>
        </div>
        <h2 style="color: \${brandDark}; margin-top: 0; font-size: 20px; text-align: center;">SMTP Configuration Test Successful</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
          This is a verified test email sent from <strong>\${platformName}</strong>.
        </p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 20px 0; font-size: 13px; color: #334155;">
          <p style="margin: 4px 0;"><strong>Sender Host:</strong> \${data.smtpHost || 'Active SMTP'}</p>
          <p style="margin: 4px 0;"><strong>Port:</strong> \${data.smtpPort || 587} (\${data.smtpEncryption || 'TLS'})</p>
          <p style="margin: 4px 0;"><strong>Timestamp:</strong> \${new Date().toLocaleString()}</p>
          <p style="margin: 4px 0;"><strong>Delivered To:</strong> \${data.recipient || 'Test Address'}</p>
        </div>
        <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
          Your email delivery settings are properly connected and ready for student enrollments, certificates, and system notifications.
        </p>
      \`;
      break;

    case 'OTP_VERIFY':
      bodyContent = \`
        <h2 style="color: \${brandDark}; margin-top: 0; font-size: 20px;">Verify Your \${platformName} Account</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
          Hello <strong>\${data.name || 'Learner'}</strong>, thank you for joining \${platformName}. Use the 6-digit verification code below:
        </p>
        <div style="margin: 28px 0; text-align: center;">
          <div style="display: inline-block; background: #f8fafc; border: 2px dashed \${brandPrimary}; border-radius: 16px; padding: 18px 36px;">
            <span style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: \${brandPrimary};">
              \${data.otp}
            </span>
          </div>
          <p style="color: #64748b; font-size: 12px; margin-top: 10px;">
            ⏰ This code will expire in <strong>\${data.expiresInMinutes || 10} minutes</strong>.
          </p>
        </div>
        <p style="color: #94a3b8; font-size: 12px;">
          If you did not request this verification, please ignore this message.
        </p>
      \`;
      break;

    case 'PASSWORD_RESET':
      bodyContent = \`
        <h2 style="color: \${brandDark}; margin-top: 0; font-size: 20px;">Password Reset Request</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
          Hi <strong>\${data.name || 'User'}</strong>, we received a request to reset the password for your \${platformName} account.
        </p>
        <div style="margin: 25px 0; text-align: center;">
          <a href="\${data.resetUrl}" style="display: inline-block; background: \${brandPrimary}; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 12px; font-weight: bold; font-size: 14px;">
            Reset Account Password
          </a>
        </div>
        <p style="color: #64748b; font-size: 12px;">
          This link will expire in 1 hour. If you did not request this, you can safely ignore this email.
        </p>
      \`;
      break;

    case 'COMPANY_INVITE':
      bodyContent = \`
        <h2 style="color: \${brandDark}; margin-top: 0; font-size: 20px;">You're Invited to Join \${data.companyName || platformName}</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
          You have been invited by <strong>\${data.invitedBy || 'the administrator'}</strong> to join as a <strong>\${data.role || 'Member'}</strong> on \${platformName}.
        </p>
        <div style="margin: 25px 0; text-align: center;">
          <a href="\${data.inviteUrl}" style="display: inline-block; background: \${brandPrimary}; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 12px; font-weight: bold; font-size: 14px;">
            Accept Invitation &amp; Set Password
          </a>
        </div>
      \`;
      break;

    case 'ENROLLMENT':
      bodyContent = \`
        <h2 style="color: \${brandDark}; margin-top: 0; font-size: 20px;">Enrollment Confirmed! 🎓</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
          Hi <strong>\${data.name || 'Student'}</strong>, you are now successfully enrolled in:
        </p>
        <div style="background: #f1f5f9; border-radius: 12px; padding: 16px; margin: 20px 0; font-size: 14px; font-weight: bold; color: #1e293b;">
          \${data.courseTitle || 'New Course'}
        </div>
        <div style="margin: 25px 0; text-align: center;">
          <a href="\${data.courseUrl || baseUrl + '/dashboard'}" style="display: inline-block; background: \${brandPrimary}; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 12px; font-weight: bold; font-size: 14px;">
            Start Learning Now →
          </a>
        </div>
      \`;
      break;

    case 'CERTIFICATE':
      bodyContent = \`
        <h2 style="color: \${brandDark}; margin-top: 0; font-size: 20px;">Congratulations! Certificate Earned 🏆</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
          Hi <strong>\${data.name || 'Student'}</strong>, you have successfully completed <strong>\${data.courseTitle}</strong>.
        </p>
        <p style="color: #475569; font-size: 13px;">Certificate ID: <code style="font-weight: bold; color: \${brandPrimary};">\${data.certificateNumber}</code></p>
        <div style="margin: 25px 0; text-align: center;">
          <a href="\${data.certificateUrl || baseUrl + '/dashboard/certificates'}" style="display: inline-block; background: #059669; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 12px; font-weight: bold; font-size: 14px;">
            View &amp; Download Certificate
          </a>
        </div>
      \`;
      break;

    default:
      bodyContent = \`
        <h2 style="color: \${brandDark}; margin-top: 0; font-size: 20px;">Notification from \${platformName}</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
          \${data.message || data.body || 'You have a new update regarding your account.'}
        </p>
        \${data.actionUrl ? \`
          <div style="margin: 25px 0; text-align: center;">
            <a href="\${data.actionUrl}" style="display: inline-block; background: \${brandPrimary}; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 12px; font-weight: bold; font-size: 14px;">
              \${data.actionText || 'View Details'}
            </a>
          </div>
        \` : ''}
      \`;
      break;
  }

  return \`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <div style="max-width: 580px; margin: 30px auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);">
          <!-- Header -->
          <div style="background: \${brandDark}; padding: 24px; text-align: center; border-bottom: 3px solid \${brandPrimary};">
            <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">
              \${platformName}
            </h1>
          </div>

          <!-- Body -->
          <div style="padding: 32px 28px;">
            \${bodyContent}
          </div>

          <!-- Footer -->
          <div style="background: #f8fafc; padding: 18px 24px; text-align: center; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8;">
            <p style="margin: 0;">&copy; \${new Date().getFullYear()} \${platformName}. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  \`;
}

/**
 * Centralized Enterprise Multi-Tenant Email Service
 */
export class EmailService {
  /**
   * Resolves SMTP configuration based on organizationId with fallback rules
   */
  static async resolveSmtpConfig(organizationId?: string | null): Promise<ResolvedSmtp | null> {
    // 1. Check Organization-specific SMTP if organizationId is present
    if (organizationId) {
      const orgConfig = await prisma.organizationEmailConfig.findUnique({
        where: { organizationId }
      });

      if (orgConfig && orgConfig.isEnabled && orgConfig.smtpHost) {
        let password = '';
        if (orgConfig.smtpPasswordEncrypted) {
          password = decryptSecret(orgConfig.smtpPasswordEncrypted);
        }

        return {
          config: {
            smtpHost: orgConfig.smtpHost,
            smtpPort: orgConfig.smtpPort,
            smtpEncryption: orgConfig.smtpEncryption,
            smtpUsername: orgConfig.smtpUsername || undefined,
            smtpPassword: password,
            fromName: orgConfig.fromName || 'Academy',
            fromEmail: orgConfig.fromEmail || 'support@example.com',
            replyTo: orgConfig.replyTo,
            authEnabled: orgConfig.authEnabled
          },
          providerType: 'ORGANIZATION_SMTP',
          isFallback: false
        };
      }

      // If org config is not enabled and fallbackToPlatform is explicitly false, stop
      if (orgConfig && !orgConfig.fallbackToPlatform) {
        return null;
      }
    }

    // 2. Check Platform-level SMTP Config
    const platformConfig = await prisma.platformEmailConfig.findFirst();
    if (platformConfig && platformConfig.isEnabled && platformConfig.smtpHost) {
      let password = '';
      if (platformConfig.smtpPasswordEncrypted) {
        password = decryptSecret(platformConfig.smtpPasswordEncrypted);
      }

      return {
        config: {
          smtpHost: platformConfig.smtpHost,
          smtpPort: platformConfig.smtpPort,
          smtpEncryption: platformConfig.smtpEncryption,
          smtpUsername: platformConfig.smtpUsername || undefined,
          smtpPassword: password,
          fromName: platformConfig.fromName || 'AADHYARA',
          fromEmail: platformConfig.fromEmail || 'support@aadhyara.com',
          replyTo: platformConfig.replyTo,
          authEnabled: platformConfig.authEnabled
        },
        providerType: 'PLATFORM_SMTP',
        isFallback: Boolean(organizationId)
      };
    }

    // 3. Check Environment Variables
    if (process.env.SMTP_HOST && process.env.SMTP_USER && (process.env.SMTP_PASSWORD || process.env.SMTP_PASS)) {
      return {
        config: {
          smtpHost: process.env.SMTP_HOST,
          smtpPort: Number(process.env.SMTP_PORT) || 587,
          smtpEncryption: process.env.SMTP_PORT === '465' ? 'SSL' : 'TLS',
          smtpUsername: process.env.SMTP_USER,
          smtpPassword: process.env.SMTP_PASSWORD || process.env.SMTP_PASS,
          fromName: process.env.EMAIL_FROM_NAME || 'AADHYARA',
          fromEmail: process.env.EMAIL_FROM || 'noreply@aadhyara.com'
        },
        providerType: 'ENV_SMTP',
        isFallback: true
      };
    }

    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      return {
        config: {
          smtpHost: 'smtp.gmail.com',
          smtpPort: 465,
          smtpEncryption: 'SSL',
          smtpUsername: process.env.GMAIL_USER,
          smtpPassword: process.env.GMAIL_APP_PASSWORD,
          fromName: process.env.EMAIL_FROM_NAME || 'AADHYARA',
          fromEmail: process.env.GMAIL_USER
        },
        providerType: 'GMAIL',
        isFallback: true
      };
    }

    return null;
  }

  /**
   * Tests SMTP Connection & Authentication Handshake
   */
  static async testConnection(config: SmtpConfigData): Promise<{ success: boolean; message: string; error?: string }> {
    if (!config.smtpHost || !config.smtpPort) {
      return { success: false, message: 'SMTP host and port are required.', error: 'MISSING_HOST_PORT' };
    }

    try {
      const isSsl = config.smtpEncryption === 'SSL' || config.smtpPort === 465;
      const transportOpts: any = {
        host: config.smtpHost,
        port: config.smtpPort,
        secure: isSsl,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
        tls: {
          rejectUnauthorized: false
        }
      };

      if (config.authEnabled !== false && config.smtpUsername && config.smtpPassword) {
        transportOpts.auth = {
          user: config.smtpUsername,
          pass: config.smtpPassword
        };
      }

      const transporter = nodemailer.createTransport(transportOpts);
      await transporter.verify();

      return { success: true, message: 'SMTP connection and authentication verified successfully.' };
    } catch (err: any) {
      console.error('[SMTP Test Connection Error]:', err.message);
      let userMsg = 'SMTP connection failed. Please verify your host, port, encryption, and credentials.';
      if (err.code === 'EAUTH') userMsg = 'SMTP authentication failed. Invalid username or password.';
      if (err.code === 'ESOCKETTIMEDOUT' || err.code === 'ETIMEDOUT') userMsg = 'SMTP connection timed out. Check host and port.';
      if (err.code === 'ECONNREFUSED') userMsg = 'Connection refused by SMTP server.';

      return { success: false, message: userMsg, error: err.code || err.message };
    }
  }

  /**
   * Sends a Verified Test Email
   */
  static async sendTestEmail(
    config: SmtpConfigData,
    recipientEmail: string,
    context: { organizationId?: string | null; organizationName?: string; isPlatform?: boolean }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const isSsl = config.smtpEncryption === 'SSL' || config.smtpPort === 465;
    const transportOpts: any = {
      host: config.smtpHost,
      port: config.smtpPort,
      secure: isSsl,
      connectionTimeout: 10000,
      tls: { rejectUnauthorized: false }
    };

    if (config.authEnabled !== false && config.smtpUsername && config.smtpPassword) {
      transportOpts.auth = {
        user: config.smtpUsername,
        pass: config.smtpPassword
      };
    }

    const transporter = nodemailer.createTransport(transportOpts);
    const orgName = context.organizationName || (context.isPlatform ? 'Platform Admin' : 'Your LMS Academy');
    const html = renderEmailHtml('TEST_EMAIL', {
      smtpHost: config.smtpHost,
      smtpPort: config.smtpPort,
      smtpEncryption: config.smtpEncryption,
      recipient: recipientEmail
    }, { name: orgName });

    const messageId = \`test_\${Date.now()}_\${Math.random().toString(36).substring(2, 7)}\`;

    try {
      await transporter.sendMail({
        from: \`"\${config.fromName}" <\${config.fromEmail}>\`,
        to: recipientEmail,
        replyTo: config.replyTo || config.fromEmail,
        subject: \`SMTP Configuration Test — \${orgName}\`,
        html
      });

      await prisma.emailLog.create({
        data: {
          organizationId: context.organizationId || null,
          recipientEmail,
          senderEmail: config.fromEmail,
          fromName: config.fromName,
          subject: \`SMTP Configuration Test — \${orgName}\`,
          template: 'TEST_EMAIL',
          status: 'SENT',
          provider: context.isPlatform ? 'PLATFORM_SMTP' : 'ORGANIZATION_SMTP',
          messageId
        }
      });

      return { success: true, messageId };
    } catch (err: any) {
      console.error('[Send Test Email Error]:', err.message);

      await prisma.emailLog.create({
        data: {
          organizationId: context.organizationId || null,
          recipientEmail,
          senderEmail: config.fromEmail,
          fromName: config.fromName,
          subject: \`SMTP Configuration Test — \${orgName}\`,
          template: 'TEST_EMAIL',
          status: 'FAILED',
          provider: context.isPlatform ? 'PLATFORM_SMTP' : 'ORGANIZATION_SMTP',
          errorMessage: err.message,
          messageId
        }
      }).catch(() => {});

      return { success: false, error: err.message };
    }
  }

  /**
   * Centralized Email Dispatcher with Multi-Tenant Routing
   */
  static async sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const resolved = await EmailService.resolveSmtpConfig(options.organizationId);
    const messageId = \`msg_\${Date.now()}_\${Math.random().toString(36).substring(2, 8)}\`;

    // Fetch organization branding if applicable
    let orgBranding: any = { name: 'AADHYARA' };
    if (options.organizationId) {
      const org = await prisma.organization.findUnique({
        where: { id: options.organizationId },
        select: { name: true, primaryColor: true, logo: true }
      });
      if (org) orgBranding = { name: org.name, primaryColor: org.primaryColor || '#4f46e5' };
    }

    const html = renderEmailHtml(options.template, options.data || {}, orgBranding);

    if (resolved && resolved.config) {
      try {
        const { config, providerType } = resolved;
        const isSsl = config.smtpEncryption === 'SSL' || config.smtpPort === 465;

        const transportOpts: any = {
          host: config.smtpHost,
          port: config.smtpPort,
          secure: isSsl,
          connectionTimeout: 10000,
          tls: { rejectUnauthorized: false }
        };

        if (config.authEnabled !== false && config.smtpUsername && config.smtpPassword) {
          transportOpts.auth = {
            user: config.smtpUsername,
            pass: config.smtpPassword
          };
        }

        const transporter = nodemailer.createTransport(transportOpts);

        await transporter.sendMail({
          from: \`"\${config.fromName}" <\${config.fromEmail}>\`,
          to: options.to,
          replyTo: config.replyTo || config.fromEmail,
          subject: options.subject,
          html
        });

        await prisma.emailLog.create({
          data: {
            organizationId: options.organizationId || null,
            userId: options.userId || null,
            recipientEmail: options.to,
            senderEmail: config.fromEmail,
            fromName: config.fromName,
            subject: options.subject,
            template: options.template,
            status: 'SENT',
            provider: providerType,
            messageId
          }
        });

        console.log(\`[\${providerType} Dispatched] \${options.template} sent to \${options.to}\`);
        return { success: true, messageId };
      } catch (err: any) {
        console.error('[Email Dispatch Error]:', err.message);

        await prisma.emailLog.create({
          data: {
            organizationId: options.organizationId || null,
            userId: options.userId || null,
            recipientEmail: options.to,
            subject: options.subject,
            template: options.template,
            status: 'FAILED',
            provider: resolved.providerType,
            errorMessage: err.message || 'Dispatch error',
            messageId
          }
        }).catch(() => {});

        return { success: false, error: err.message };
      }
    }

    // Development / No SMTP configured Console Fallback
    console.log(\`\\n=================== 📧 \${orgBranding.name.toUpperCase()} EMAIL SERVICE [CONSOLE LOG] 📧 ===================\`);
    console.log(\`TO: \${options.to}\`);
    console.log(\`SUBJECT: \${options.subject}\`);
    console.log(\`TEMPLATE: \${options.template}\`);
    if (options.template === 'OTP_VERIFY') {
      console.log(\`🔑 [VERIFICATION OTP CODE]: >>> \${options.data?.otp} <<<\`);
    }
    if (options.template === 'PASSWORD_RESET') {
      console.log(\`🔗 [RESET URL]: \${options.data?.resetUrl}\`);
    }
    console.log(\`========================================================================================\\n\`);

    await prisma.emailLog.create({
      data: {
        organizationId: options.organizationId || null,
        userId: options.userId || null,
        recipientEmail: options.to,
        subject: options.subject,
        template: options.template,
        status: 'SENT',
        provider: 'CONSOLE_FALLBACK',
        messageId
      }
    });

    return { success: true, messageId };
  }
}

// Backward-compatible direct function exports
export const sendEmail = EmailService.sendEmail;
`;

fs.writeFileSync('src/lib/email.ts', code.trim(), 'utf8');
console.log('[Updated] src/lib/email.ts');