import nodemailer, { type Transporter } from 'nodemailer';
import { getEnv } from '../config/env.js';
import { logger } from '../config/logger.js';

let transporter: Transporter | undefined;

function getTransporter(): Transporter | undefined {
  const env = getEnv();
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    return undefined;
  }

  transporter ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
  return transporter;
}

export async function sendPasswordResetEmail(
  recipient: string,
  resetUrl: string,
): Promise<void> {
  const transport = getTransporter();
  if (!transport) {
    logger.info(
      { recipient },
      'SMTP is unset; password reset email was not sent',
    );
    return;
  }

  await transport.sendMail({
    from: getEnv().EMAIL_FROM,
    to: recipient,
    subject: 'Reset your AgriConnect password',
    text: `Reset your password using this link (valid for one hour): ${resetUrl}`,
    html: `<p>Reset your password using the link below. It is valid for one hour.</p><p><a href="${resetUrl}">Reset password</a></p>`,
  });
}
