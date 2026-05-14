import nodemailer from 'nodemailer';

export interface SendEmailOptions {
  to: string;
  subject: string;
  body: string;
  replyTo?: string;
}

function createTransport() {
  const port = Number(process.env.SMTP_PORT || 587);
  const secure =
    process.env.SMTP_SECURE === 'true' ||
    (process.env.SMTP_SECURE !== 'false' && port === 465);

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    requireTLS: !secure,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function getSmtpErrorMessage(err: unknown): string {
  if (!(err instanceof Error)) return 'Unknown SMTP error';
  const msg = err.message || 'Unknown SMTP error';
  const lower = msg.toLowerCase();
  if (lower.includes('invalid login') || lower.includes('auth') || lower.includes('535')) {
    return `SMTP authentication failed. Verify SMTP_USER/SMTP_PASS for your mailbox. Original error: ${msg}`;
  }
  if (lower.includes('etimedout') || lower.includes('timed out')) {
    return `SMTP connection timed out. Check SMTP_HOST/SMTP_PORT and firewall/provider SMTP restrictions. Original error: ${msg}`;
  }
  if (lower.includes('self signed certificate') || lower.includes('certificate') || lower.includes('tls')) {
    return `SMTP TLS negotiation failed. For port 587 use SMTP_SECURE=false, for 465 use SMTP_SECURE=true. Original error: ${msg}`;
  }
  if (lower.includes('econnrefused') || lower.includes('refused')) {
    return `SMTP server refused connection. Confirm SMTP_HOST/SMTP_PORT and that outbound SMTP is allowed on your network. Original error: ${msg}`;
  }
  return msg;
}

export async function sendEmail({ to, subject, body, replyTo }: SendEmailOptions): Promise<void> {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass || pass === 'your_email_password_here') {
    throw new Error(
      'SMTP not configured. Add SMTP_USER and SMTP_PASS to .env.local and restart the server.'
    );
  }

  const transporter = createTransport();

  try {
    await transporter.sendMail({
      from: `${process.env.SENDER_NAME || 'LeadTool'} <${process.env.SMTP_FROM || user}>`,
      to,
      subject,
      text: body,
      replyTo: replyTo || user,
    });
  } catch (err: unknown) {
    throw new Error(getSmtpErrorMessage(err));
  }
}

export async function verifyConnection(): Promise<{ ok: boolean; error?: string }> {
  try {
    const transporter = createTransport();
    await transporter.verify();
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: getSmtpErrorMessage(err) };
  }
}
