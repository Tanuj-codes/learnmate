import nodemailer from 'nodemailer';
import config from '../config/env.js';

let transporter = null;

function getTransporter() {
  if (!config.EMAIL_ENABLED) return null;
  if (config.EMAIL_PROVIDER !== 'smtp') return null;
  if (!config.SMTP_HOST) {
    console.warn('[email] EMAIL_ENABLED=true but SMTP_HOST is empty. Email delivery is skipped.');
    return null;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_SECURE,
      auth: config.SMTP_USER ? { user: config.SMTP_USER, pass: config.SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

export function isEmailConfigured() {
  if (!config.EMAIL_ENABLED) return false;
  if (config.EMAIL_PROVIDER === 'resend') return Boolean(config.RESEND_API_KEY);
  return Boolean(config.SMTP_HOST);
}

/**
 * Sends a transactional email when explicitly enabled. Failures are logged but
 * never break the API request; in-app notifications remain the baseline.
 */
export async function sendEmail({ to, subject, text, html }) {
  if (!config.EMAIL_ENABLED) return { sent: false, reason: 'disabled' };

  try {
    if (config.EMAIL_PROVIDER === 'resend') {
      if (!config.RESEND_API_KEY) {
        console.warn('[email] EMAIL_PROVIDER=resend but RESEND_API_KEY is missing. Email skipped.');
        return { sent: false, reason: 'missing-api-key' };
      }
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: config.EMAIL_FROM, to: [to], subject, text, html }),
      });
      if (!response.ok) {
        console.error('[email] Resend rejected the message', response.status);
        return { sent: false, reason: 'provider-error' };
      }
      return { sent: true, provider: 'resend' };
    }

    const transport = getTransporter();
    if (!transport) return { sent: false, reason: 'not-configured' };
    await transport.sendMail({ from: config.EMAIL_FROM, to, subject, text, html });
    return { sent: true, provider: 'smtp' };
  } catch (error) {
    console.error('[email] Failed to send notification email:', error.message);
    return { sent: false, reason: 'send-failed' };
  }
}

export function buildNotificationEmail({ name, title, message, link }) {
  const appUrl = config.corsOrigins[0] || 'http://localhost:5173';
  const url = link ? `${appUrl}${link}` : appUrl;
  return {
    subject: `${title} - LearnMate`,
    text: `Hi ${name},\n\n${message}\n\nOpen LearnMate: ${url}\n\nYou can turn off email reminders in Profile and Settings.`,
    html: `<p>Hi ${name},</p><p>${message}</p><p><a href="${url}">Open LearnMate</a></p><p style="color:#64748b;font-size:12px">You can turn off email reminders in Profile and Settings.</p>`,
  };
}
