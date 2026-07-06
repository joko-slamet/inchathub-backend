import nodemailer from "nodemailer";
import { env } from "../config/env";

const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: env.smtp.port === 465,
  auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
});

export async function sendMail(options: { to: string; subject: string; html: string }) {
  if (!env.smtp.host) {
    console.warn(`SMTP not configured, skipping email to ${options.to}: ${options.subject}`);
    return;
  }
  await transporter.sendMail({ from: env.smtp.from, ...options });
}
