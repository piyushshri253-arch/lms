import { prisma } from './prisma';
import { sendEmail } from './email';
import { createNotification } from './notification';

export type TeamRecipientType = 'SUPER_ADMIN' | 'ADMIN' | 'ACCOUNTS' | 'AUDITOR' | 'TECHNICAL';

export interface IssueRoutingConfig {
  label: string;
  primaryTeam: string;
  teams: TeamRecipientType[];
  summary: string;
}

export const ISSUE_ROUTING_CONFIGS: Record<string, IssueRoutingConfig> = {
  PAYMENT_ISSUE: {
    label: 'Payment and Payout Issues',
    primaryTeam: 'Accounts',
    teams: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTS', 'TECHNICAL'],
    summary: 'Super Admin, Admin, Accounts and Technical team (Primary Accounts)'
  },
  COURSE_APPROVAL_ISSUE: {
    label: 'Course Approval Issues',
    primaryTeam: 'Auditor',
    teams: ['SUPER_ADMIN', 'ADMIN', 'AUDITOR', 'TECHNICAL'],
    summary: 'Super Admin, Admin, Auditor and Technical team (Primary Auditor)'
  },
  BANK_VERIFICATION_ISSUE: {
    label: 'Bank Verification Issue',
    primaryTeam: 'Accounts',
    teams: ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTS', 'TECHNICAL'],
    summary: 'Super Admin, Admin, Accounts and Technical team (Primary Accounts)'
  },
  TECHNICAL_ISSUE: {
    label: 'Technical Issue',
    primaryTeam: 'Tech. Team',
    teams: ['SUPER_ADMIN', 'ADMIN', 'TECHNICAL'],
    summary: 'Super Admin, Admin, and Technical team (Primary Tech. Team)'
  }
};

const DEFAULT_TEAM_FALLBACK_EMAILS: Record<TeamRecipientType, string[]> = {
  SUPER_ADMIN: ['superadmin@morenateach.com'],
  ADMIN: ['admin@morenateach.com'],
  ACCOUNTS: ['accounts@morenateach.com', 'finance@morenateach.com'],
  AUDITOR: ['auditor@morenateach.com', 'reviewer@morenateach.com'],
  TECHNICAL: ['tech@morenateach.com', 'technical@morenateach.com', 'support@morenateach.com']
};

/**
 * Resolves all recipient database users and dedicated team email mailboxes for the target teams.
 */
export async function resolveTeamRecipients(teams: TeamRecipientType[]): Promise<{
  users: Array<{ id: string; name: string; email: string; role: string }>;
  emails: string[];
}> {
  const userMap = new Map<string, { id: string; name: string; email: string; role: string }>();
  const emailSet = new Set<string>();

  // Add default team mailbox emails for target teams
  for (const t of teams) {
    const list = DEFAULT_TEAM_FALLBACK_EMAILS[t] || [];
    for (const em of list) {
      if (em && em.includes('@')) emailSet.add(em.toLowerCase().trim());
    }
  }

  // 1. Fetch Super Admins if targeted
  if (teams.includes('SUPER_ADMIN')) {
    try {
      const superAdmins = await prisma.user.findMany({
        where: { role: 'SUPER_ADMIN' },
        select: { id: true, name: true, email: true, role: true }
      });
      for (const u of superAdmins) {
        userMap.set(u.id, u);
        if (u.email) emailSet.add(u.email.toLowerCase().trim());
      }
    } catch {}
  }

  // 2. Fetch Admins if targeted
  if (teams.includes('ADMIN')) {
    try {
      const admins = await prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'LMS_ADMIN', 'SALES_ADMIN'] } },
        select: { id: true, name: true, email: true, role: true }
      });
      for (const u of admins) {
        userMap.set(u.id, u);
        if (u.email) emailSet.add(u.email.toLowerCase().trim());
      }
    } catch {}
  }

  // 3. Fetch Auditors / Reviewers if targeted
  if (teams.includes('AUDITOR')) {
    try {
      const auditors = await prisma.user.findMany({
        where: {
          OR: [
            { role: { in: ['REVIEWER', 'AUDITOR'] } },
            { customRole: { contains: 'auditor', mode: 'insensitive' } },
            { customRole: { contains: 'reviewer', mode: 'insensitive' } },
            { email: { contains: 'auditor', mode: 'insensitive' } }
          ]
        },
        select: { id: true, name: true, email: true, role: true }
      });
      for (const u of auditors) {
        userMap.set(u.id, u);
        if (u.email) emailSet.add(u.email.toLowerCase().trim());
      }
    } catch {}
  }

  // 4. Fetch Accounts / Finance team members if targeted
  if (teams.includes('ACCOUNTS')) {
    try {
      const accountsUsers = await prisma.user.findMany({
        where: {
          OR: [
            { customRole: { contains: 'account', mode: 'insensitive' } },
            { customRole: { contains: 'finance', mode: 'insensitive' } },
            { customRole: { contains: 'billing', mode: 'insensitive' } },
            { email: { contains: 'account', mode: 'insensitive' } },
            { email: { contains: 'finance', mode: 'insensitive' } }
          ]
        },
        select: { id: true, name: true, email: true, role: true }
      });
      for (const u of accountsUsers) {
        userMap.set(u.id, u);
        if (u.email) emailSet.add(u.email.toLowerCase().trim());
      }
    } catch {}
  }

  // 5. Fetch Technical team members if targeted
  if (teams.includes('TECHNICAL')) {
    try {
      const techUsers = await prisma.user.findMany({
        where: {
          OR: [
            { customRole: { contains: 'tech', mode: 'insensitive' } },
            { customRole: { contains: 'engineer', mode: 'insensitive' } },
            { customRole: { contains: 'developer', mode: 'insensitive' } },
            { email: { contains: 'tech', mode: 'insensitive' } },
            { email: { contains: 'engineering', mode: 'insensitive' } }
          ]
        },
        select: { id: true, name: true, email: true, role: true }
      });
      for (const u of techUsers) {
        userMap.set(u.id, u);
        if (u.email) emailSet.add(u.email.toLowerCase().trim());
      }
    } catch {}
  }

  return {
    users: Array.from(userMap.values()),
    emails: Array.from(emailSet)
  };
}

/**
 * Dispatches ticket creation notifications to target teams on Dashboard + Email.
 */
export async function dispatchTicketNotification(payload: {
  ticketNumber: string;
  ticketId: string;
  category: string;
  priority: string;
  subject: string;
  description: string;
  instructorName: string;
  instructorEmail: string;
  courseTitle?: string | null;
  referenceId?: string | null;
}) {
  const config =
    ISSUE_ROUTING_CONFIGS[payload.category] || ISSUE_ROUTING_CONFIGS.PAYMENT_ISSUE;

  const { users, emails } = await resolveTeamRecipients(config.teams);

  // 1. Create In-App Dashboard Notifications for all resolved users
  const notifTitle = `[${config.primaryTeam}] New Ticket #${payload.ticketNumber}: ${payload.subject}`;
  const notifMessage = `Instructor ${payload.instructorName} raised a ${config.label} ticket (${payload.priority} priority). Routing: ${config.summary}.`;

  for (const u of users) {
    const targetLink =
      u.role === 'SUPER_ADMIN'
        ? '/super-admin/support'
        : u.role === 'REVIEWER' || u.role === 'AUDITOR'
        ? '/reviewer'
        : '/admin/support';

    await createNotification({
      userId: u.id,
      title: notifTitle,
      message: notifMessage,
      type: 'SYSTEM',
      category: 'SYSTEM',
      link: targetLink
    }).catch(() => {});
  }

  // 2. Dispatch Email Notifications to all target team mailboxes
  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://morenateach.com';
  const emailSubject = `[Ticket #${payload.ticketNumber}] [${config.primaryTeam}] ${payload.subject}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .card { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 28px; color: #ffffff; }
        .content { padding: 28px; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
        .badge-priority { background: #fee2e2; color: #991b1b; }
        .badge-team { background: #e0e7ff; color: #3730a3; margin-left: 6px; }
        .routing-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 14px 18px; margin: 20px 0; font-size: 13px; color: #166534; }
        .info-table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
        .info-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
        .info-table td.label { width: 35%; color: #64748b; font-weight: 600; }
        .info-table td.value { color: #0f172a; font-weight: 700; }
        .desc-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 16px 0; font-size: 13px; line-height: 1.6; color: #334155; white-space: pre-wrap; }
        .btn { display: inline-block; background: #4f46e5; color: #ffffff !important; padding: 12px 24px; border-radius: 10px; font-size: 13px; font-weight: 700; text-decoration: none; margin-top: 10px; }
        .footer { padding: 20px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; background: #f8fafc; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; opacity: 0.9;">Morena Teach • Support Priority Routing Desk</div>
          <h1 style="margin: 8px 0 0; font-size: 22px; font-weight: 800; color: #ffffff;">New Instructor Ticket Raised</h1>
          <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.95;">Ticket Reference: #${payload.ticketNumber}</p>
        </div>
        <div class="content">
          <div style="margin-bottom: 16px;">
            <span class="badge badge-priority">${payload.priority} PRIORITY</span>
            <span class="badge badge-team">PRIMARY: ${config.primaryTeam.toUpperCase()}</span>
          </div>

          <div class="routing-box">
            <strong>📢 Team Notification Routing:</strong><br/>
            ${config.summary}
          </div>

          <h2 style="font-size: 17px; font-weight: 800; color: #0f172a; margin: 16px 0 8px;">${payload.subject}</h2>

          <table class="info-table">
            <tr>
              <td class="label">Issue Category</td>
              <td class="value">${config.label}</td>
            </tr>
            <tr>
              <td class="label">Instructor Name</td>
              <td class="value">${payload.instructorName}</td>
            </tr>
            <tr>
              <td class="label">Instructor Email</td>
              <td class="value">${payload.instructorEmail}</td>
            </tr>
            ${
              payload.courseTitle
                ? `<tr><td class="label">Related Course</td><td class="value">${payload.courseTitle}</td></tr>`
                : ''
            }
            ${
              payload.referenceId
                ? `<tr><td class="label">Transaction / Bank Ref</td><td class="value">${payload.referenceId}</td></tr>`
                : ''
            }
            <tr>
              <td class="label">Primary Handler</td>
              <td class="value" style="color: #4f46e5;">${config.primaryTeam}</td>
            </tr>
          </table>

          <div style="font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 16px;">Issue Description & Context:</div>
          <div class="desc-box">${payload.description}</div>

          <div style="text-align: center; margin: 24px 0 10px;">
            <a href="${baseUrl}/super-admin/support" class="btn">Open Support Desk & Respond →</a>
          </div>
        </div>
        <div class="footer">
          This is an automated priority dispatch from Morena Teach LMS.<br/>
          Notified Teams: Super Admin, Admin, Accounts, Auditor & Technical Team as per system routing policy.
        </div>
      </div>
    </body>
    </html>
  `;

  for (const to of emails) {
    await sendEmail({
      to,
      template: 'SUPPORT',
      subject: emailSubject,
      html,
      text: `[Ticket #${payload.ticketNumber}] [${config.primaryTeam}] ${payload.subject}\n\nCategory: ${config.label}\nInstructor: ${payload.instructorName} (${payload.instructorEmail})\nPriority: ${payload.priority}\nRouting: ${config.summary}\n\nDescription:\n${payload.description}\n\nView at ${baseUrl}/super-admin/support`
    }).catch((e) => console.error('[Ticket Email Send Error]:', to, e));
  }
}

/**
 * Dispatches Payout Request notifications to Super Admin, Admin, Accounts & Technical team (Primary: Accounts).
 */
export async function dispatchPayoutRequestNotification(payload: {
  payoutId: string;
  amount: number;
  netAmount: number;
  payoutMethod: string;
  instructorName: string;
  instructorEmail: string;
  bankName?: string;
  accountNumberMasked?: string;
  ifscCode?: string;
}) {
  const teams: TeamRecipientType[] = ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTS', 'TECHNICAL'];
  const summary = 'Super Admin, Admin, Accounts and Technical team (Primary Accounts)';
  const { users, emails } = await resolveTeamRecipients(teams);

  const formattedAmount = `₹${Number(payload.amount).toLocaleString('en-IN')}`;
  const notifTitle = `[Accounts Primary] New Payout Request: ${formattedAmount} by ${payload.instructorName}`;
  const notifMessage = `Instructor ${payload.instructorName} (${payload.instructorEmail}) requested a payout of ${formattedAmount} via ${payload.payoutMethod}. Notified: ${summary}.`;

  // 1. Dashboard Notifications
  for (const u of users) {
    const targetLink =
      u.role === 'SUPER_ADMIN' ? '/super-admin/payouts' : '/admin/payouts';
    await createNotification({
      userId: u.id,
      title: notifTitle,
      message: notifMessage,
      type: 'PAYMENT',
      category: 'BILLING',
      link: targetLink
    }).catch(() => {});
  }

  // 2. Email Notifications
  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://morenateach.com';
  const emailSubject = `[Action Required] [Accounts] Payout Request ${formattedAmount} - ${payload.instructorName}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .card { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
        .header { background: linear-gradient(135deg, #059669 0%, #0d9488 100%); padding: 28px; color: #ffffff; }
        .content { padding: 28px; }
        .routing-box { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 14px 18px; margin: 16px 0; font-size: 13px; color: #065f46; }
        .info-table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
        .info-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
        .info-table td.label { width: 35%; color: #64748b; font-weight: 600; }
        .info-table td.value { color: #0f172a; font-weight: 700; }
        .btn { display: inline-block; background: #059669; color: #ffffff !important; padding: 12px 24px; border-radius: 10px; font-size: 13px; font-weight: 700; text-decoration: none; margin-top: 10px; }
        .footer { padding: 20px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Morena Teach • Financial Settlements</div>
          <h1 style="margin: 8px 0 0; font-size: 22px; font-weight: 800; color: #ffffff;">New Payout Request Submitted</h1>
          <p style="margin: 4px 0 0; font-size: 14px; opacity: 0.95;">Requested Amount: ${formattedAmount}</p>
        </div>
        <div class="content">
          <div class="routing-box">
            <strong>📢 Financial Notification Routing:</strong><br/>
            ${summary}
          </div>

          <table class="info-table">
            <tr>
              <td class="label">Instructor</td>
              <td class="value">${payload.instructorName}</td>
            </tr>
            <tr>
              <td class="label">Email</td>
              <td class="value">${payload.instructorEmail}</td>
            </tr>
            <tr>
              <td class="label">Gross Requested</td>
              <td class="value" style="color: #059669; font-size: 15px;">${formattedAmount}</td>
            </tr>
            <tr>
              <td class="label">Disbursement Method</td>
              <td class="value">${payload.payoutMethod}</td>
            </tr>
            ${
              payload.bankName
                ? `<tr><td class="label">Bank Name</td><td class="value">${payload.bankName}</td></tr>`
                : ''
            }
            ${
              payload.accountNumberMasked
                ? `<tr><td class="label">Account Number</td><td class="value">${payload.accountNumberMasked}</td></tr>`
                : ''
            }
            ${
              payload.ifscCode
                ? `<tr><td class="label">IFSC Code</td><td class="value">${payload.ifscCode}</td></tr>`
                : ''
            }
            <tr>
              <td class="label">Primary Action Team</td>
              <td class="value" style="color: #059669;">Accounts Team</td>
            </tr>
          </table>

          <div style="text-align: center; margin: 24px 0 10px;">
            <a href="${baseUrl}/super-admin/payouts" class="btn">Review & Process Payout →</a>
          </div>
        </div>
        <div class="footer">
          Dispatched to Super Admin, Admin, Accounts & Technical Team per Morena Teach policy.
        </div>
      </div>
    </body>
    </html>
  `;

  for (const to of emails) {
    await sendEmail({
      to,
      template: 'PAYMENT_SUCCESS',
      subject: emailSubject,
      html,
      text: `Payout Request: ${formattedAmount} by ${payload.instructorName} (${payload.instructorEmail})\nPrimary Team: Accounts\nRouting: ${summary}\nReview at: ${baseUrl}/super-admin/payouts`
    }).catch((e) => console.error('[Payout Email Send Error]:', to, e));
  }
}

/**
 * Dispatches Bank Verification notifications to Super Admin, Admin, Accounts & Technical team (Primary: Accounts).
 */
export async function dispatchBankVerificationNotification(payload: {
  instructorName: string;
  instructorEmail: string;
  bankName: string;
  accountNumberMasked: string;
  ifscCode: string;
  panNumber?: string;
}) {
  const teams: TeamRecipientType[] = ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTS', 'TECHNICAL'];
  const summary = 'Super Admin, Admin, Accounts and Technical team (Primary Accounts)';
  const { users, emails } = await resolveTeamRecipients(teams);

  const notifTitle = `[Accounts Primary] Bank & KYC Verification Needed: ${payload.instructorName}`;
  const notifMessage = `Instructor ${payload.instructorName} submitted ${payload.bankName} (${payload.accountNumberMasked}, IFSC: ${payload.ifscCode}) for KYC verification. Notified: ${summary}.`;

  // 1. In-App Dashboard Notifications
  for (const u of users) {
    const targetLink =
      u.role === 'SUPER_ADMIN' ? '/super-admin/users' : '/admin/users';
    await createNotification({
      userId: u.id,
      title: notifTitle,
      message: notifMessage,
      type: 'ACCOUNT',
      category: 'SECURITY',
      link: targetLink
    }).catch(() => {});
  }

  // 2. Email Notifications
  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://morenateach.com';
  const emailSubject = `[KYC Verification] [Accounts] Bank Details Submitted - ${payload.instructorName}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .card { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
        .header { background: linear-gradient(135deg, #d97706 0%, #b45309 100%); padding: 28px; color: #ffffff; }
        .content { padding: 28px; }
        .routing-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 14px 18px; margin: 16px 0; font-size: 13px; color: #92400e; }
        .info-table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
        .info-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
        .info-table td.label { width: 35%; color: #64748b; font-weight: 600; }
        .info-table td.value { color: #0f172a; font-weight: 700; }
        .btn { display: inline-block; background: #d97706; color: #ffffff !important; padding: 12px 24px; border-radius: 10px; font-size: 13px; font-weight: 700; text-decoration: none; margin-top: 10px; }
        .footer { padding: 20px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Morena Teach • Compliance & Accounts Desk</div>
          <h1 style="margin: 8px 0 0; font-size: 22px; font-weight: 800; color: #ffffff;">Bank Account & KYC Submitted</h1>
          <p style="margin: 4px 0 0; font-size: 14px; opacity: 0.95;">Instructor: ${payload.instructorName}</p>
        </div>
        <div class="content">
          <div class="routing-box">
            <strong>📢 Compliance Routing:</strong><br/>
            ${summary}
          </div>

          <table class="info-table">
            <tr>
              <td class="label">Instructor</td>
              <td class="value">${payload.instructorName}</td>
            </tr>
            <tr>
              <td class="label">Email</td>
              <td class="value">${payload.instructorEmail}</td>
            </tr>
            <tr>
              <td class="label">Bank Name</td>
              <td class="value">${payload.bankName}</td>
            </tr>
            <tr>
              <td class="label">Account Number</td>
              <td class="value">${payload.accountNumberMasked}</td>
            </tr>
            <tr>
              <td class="label">IFSC Code</td>
              <td class="value">${payload.ifscCode}</td>
            </tr>
            ${
              payload.panNumber
                ? `<tr><td class="label">PAN Number</td><td class="value">${payload.panNumber}</td></tr>`
                : ''
            }
            <tr>
              <td class="label">Primary Verification Team</td>
              <td class="value" style="color: #d97706;">Accounts Team</td>
            </tr>
          </table>

          <div style="text-align: center; margin: 24px 0 10px;">
            <a href="${baseUrl}/super-admin/users" class="btn">Verify Bank Details & Documents →</a>
          </div>
        </div>
        <div class="footer">
          Dispatched to Super Admin, Admin, Accounts & Technical Team per Morena Teach policy.
        </div>
      </div>
    </body>
    </html>
  `;

  for (const to of emails) {
    await sendEmail({
      to,
      template: 'SUPPORT',
      subject: emailSubject,
      html,
      text: `Bank KYC Submitted: ${payload.instructorName} (${payload.instructorEmail})\nBank: ${payload.bankName} (${payload.accountNumberMasked}, IFSC: ${payload.ifscCode})\nPrimary Team: Accounts\nRouting: ${summary}\nVerify at: ${baseUrl}/super-admin/users`
    }).catch((e) => console.error('[Bank KYC Email Send Error]:', to, e));
  }
}

/**
 * Dispatches Course Approval notifications to Super Admin, Admin, Auditor & Technical team (Primary: Auditor).
 */
export async function dispatchCourseApprovalNotification(payload: {
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  instructorName: string;
  instructorEmail: string;
}) {
  const teams: TeamRecipientType[] = ['SUPER_ADMIN', 'ADMIN', 'AUDITOR', 'TECHNICAL'];
  const summary = 'Super Admin, Admin, Auditor and Technical team (Primary Auditor)';
  const { users, emails } = await resolveTeamRecipients(teams);

  const notifTitle = `[Auditor Primary] Course Submitted for Review: "${payload.courseTitle}"`;
  const notifMessage = `Instructor ${payload.instructorName} submitted "${payload.courseTitle}" for curriculum audit & approval. Notified: ${summary}.`;

  // 1. In-App Dashboard Notifications
  for (const u of users) {
    const targetLink =
      u.role === 'REVIEWER' || u.role === 'AUDITOR'
        ? `/reviewer/courses/${payload.courseId}`
        : `/super-admin/courses`;
    await createNotification({
      userId: u.id,
      title: notifTitle,
      message: notifMessage,
      type: 'COURSE',
      category: 'COURSES',
      link: targetLink
    }).catch(() => {});
  }

  // 2. Email Notifications
  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://morenateach.com';
  const emailSubject = `[Course Review Required] [Auditor] "${payload.courseTitle}" - ${payload.instructorName}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .card { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
        .header { background: linear-gradient(135deg, #4338ca 0%, #6366f1 100%); padding: 28px; color: #ffffff; }
        .content { padding: 28px; }
        .routing-box { background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 12px; padding: 14px 18px; margin: 16px 0; font-size: 13px; color: #3730a3; }
        .info-table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
        .info-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
        .info-table td.label { width: 35%; color: #64748b; font-weight: 600; }
        .info-table td.value { color: #0f172a; font-weight: 700; }
        .btn { display: inline-block; background: #4338ca; color: #ffffff !important; padding: 12px 24px; border-radius: 10px; font-size: 13px; font-weight: 700; text-decoration: none; margin-top: 10px; }
        .footer { padding: 20px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Morena Teach • Academic Quality Audit</div>
          <h1 style="margin: 8px 0 0; font-size: 22px; font-weight: 800; color: #ffffff;">New Course Submitted for Review</h1>
          <p style="margin: 4px 0 0; font-size: 14px; opacity: 0.95;">"${payload.courseTitle}"</p>
        </div>
        <div class="content">
          <div class="routing-box">
            <strong>📢 Academic Audit Routing:</strong><br/>
            ${summary}
          </div>

          <table class="info-table">
            <tr>
              <td class="label">Course Title</td>
              <td class="value" style="color: #4338ca;">${payload.courseTitle}</td>
            </tr>
            <tr>
              <td class="label">Author / Instructor</td>
              <td class="value">${payload.instructorName}</td>
            </tr>
            <tr>
              <td class="label">Author Email</td>
              <td class="value">${payload.instructorEmail}</td>
            </tr>
            <tr>
              <td class="label">Primary Reviewer</td>
              <td class="value" style="color: #4338ca;">Course Auditor (Reviewer)</td>
            </tr>
          </table>

          <div style="text-align: center; margin: 24px 0 10px;">
            <a href="${baseUrl}/reviewer/courses/${payload.courseId}" class="btn">Audit Course & Review Lessons →</a>
          </div>
        </div>
        <div class="footer">
          Dispatched to Super Admin, Admin, Auditor & Technical Team per Morena Teach policy.
        </div>
      </div>
    </body>
    </html>
  `;

  for (const to of emails) {
    await sendEmail({
      to,
      template: 'SUPPORT',
      subject: emailSubject,
      html,
      text: `Course Submitted for Audit: "${payload.courseTitle}" by ${payload.instructorName} (${payload.instructorEmail})\nPrimary Team: Auditor\nRouting: ${summary}\nReview at: ${baseUrl}/reviewer/courses/${payload.courseId}`
    }).catch((e) => console.error('[Course Audit Email Send Error]:', to, e));
  }
}
