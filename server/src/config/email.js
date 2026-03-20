/**
 * Email sending via SMTP (nodemailer). Configure with env vars.
 * If SMTP is not set, sendMail no-ops and logs in dev.
 */
import nodemailer from 'nodemailer';

const WEB_ORIGIN = process.env.WEB_ORIGIN || 'http://localhost:5173';
const SMTP_FROM = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@elsnerqwilr.com';

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT, 10) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: {
      // Allow self-signed / private CA certificates on the SMTP server
      rejectUnauthorized: false,
    },
  });
}

const transporter = createTransporter();
const smtpConfigured = !!transporter;

/**
 * Send an email. If SMTP is not configured, logs and resolves (no throw).
 * @param {{ to: string, subject: string, text?: string, html?: string }} options
 */
export async function sendMail({ to, subject, text, html }) {
  if (!transporter) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[email] SMTP not configured. Would send:', { to, subject });
    }
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: SMTP_FROM,
      to,
      subject,
      text: text || (html ? html.replace(/<[^>]+>/g, '') : ''),
      html: html || undefined,
    });
    if (process.env.NODE_ENV !== 'production') {
      console.log('[email] Sent:', info.messageId, 'to', to);
    }
  } catch (err) {
    console.error('[email] Send failed:', err.message);
    throw err;
  }
}

export function isEmailConfigured() {
  return smtpConfigured;
}

/**
 * Verification link for new signups.
 */
export function getVerificationLink(token) {
  return `${WEB_ORIGIN}/verify-email?token=${encodeURIComponent(token)}`;
}

/**
 * Reset password link.
 */
export function getResetPasswordLink(token) {
  return `${WEB_ORIGIN}/reset-password?token=${encodeURIComponent(token)}`;
}

export { WEB_ORIGIN };
