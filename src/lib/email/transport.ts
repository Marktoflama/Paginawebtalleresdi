import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import nodemailer, { type Transporter } from "nodemailer";

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: Array<{ filename: string; content: string; contentType: string }>;
}

function fromAddress(): string {
  return process.env.EMAIL_FROM?.trim() || "Taller <reservas@localhost>";
}

let smtp: Transporter | null = null;

function smtpTransport(): Transporter {
  if (smtp) return smtp;
  const host = process.env.SMTP_HOST?.trim();
  if (!host) throw new Error("EMAIL_TRANSPORT=smtp but SMTP_HOST is not set");
  const port = Number(process.env.SMTP_PORT || 587);
  smtp = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" } : undefined,
  });
  return smtp;
}

/**
 * EMAIL_TRANSPORT=smtp    → send through SMTP (Microsoft 365, Resend, …)
 * EMAIL_TRANSPORT=console → render the full MIME message to ./.mail/*.eml
 *                           (or log it on read-only serverless file systems)
 */
export async function sendEmail(message: OutgoingEmail): Promise<{ id: string; transport: string }> {
  const mode = (process.env.EMAIL_TRANSPORT ?? "console").trim().toLowerCase();
  const mail = { from: fromAddress(), ...message };

  if (mode === "smtp") {
    const info = await smtpTransport().sendMail(mail);
    return { id: info.messageId, transport: "smtp" };
  }

  const stream = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: "windows" });
  const info = await stream.sendMail(mail);
  const raw = info.message as Buffer;
  const safeTo = message.to.replace(/[^a-z0-9@._-]/gi, "_");
  const file = `${new Date().toISOString().replace(/[:.]/g, "-")}_${safeTo}.eml`;
  try {
    const dir = path.join(process.cwd(), ".mail");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, file), raw);
  } catch {
    console.info(`[email:console] ${message.to} · ${message.subject}\n${message.text}`);
  }
  return { id: file, transport: "console" };
}
