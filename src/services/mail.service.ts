import nodemailer from "nodemailer";
import { env } from "../config/env";

function hasMailConfig() {
  return Boolean(env.mail.host && env.mail.user && env.mail.pass && env.mail.fromEmail);
}

function createTransporter() {
  return nodemailer.createTransport({
    host: env.mail.host,
    port: env.mail.port,
    secure: env.mail.secure,
    auth: {
      user: env.mail.user,
      pass: env.mail.pass,
    },
  });
}

export const mailService = {
  async sendWebinarConfirmation(payload: {
    name: string;
    city: string;
    email: string;
    whatsapp: string;
  }) {
    if (!hasMailConfig()) {
      console.warn("[mail] webinar confirmation skipped: mail env is incomplete");
      return;
    }

    const transporter = createTransporter();

    await transporter.sendMail({
      from: `${env.mail.fromName} <${env.mail.fromEmail}>`,
      to: payload.email,
      subject: "Konfirmasi Registrasi Webinar ChatHub",
      text: [
        `Halo ${payload.name},`,
        "",
        "Terima kasih, registrasi webinar Anda sudah kami terima.",
        "Berikut data pendaftaran Anda:",
        `Nama: ${payload.name}`,
        `Kota: ${payload.city}`,
        `Email: ${payload.email}`,
        `WhatsApp: ${payload.whatsapp}`,
        "",
        "Tim ChatHub akan menghubungi Anda kembali jika ada informasi lanjutan.",
        "",
        "Salam,",
        "ChatHub",
      ].join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1a1618">
          <p>Halo <strong>${payload.name}</strong>,</p>
          <p>Terima kasih, registrasi webinar Anda sudah kami terima.</p>
          <p>Berikut data pendaftaran Anda:</p>
          <table style="border-collapse:collapse">
            <tr><td style="padding:4px 12px 4px 0"><strong>Nama</strong></td><td>${payload.name}</td></tr>
            <tr><td style="padding:4px 12px 4px 0"><strong>Kota</strong></td><td>${payload.city}</td></tr>
            <tr><td style="padding:4px 12px 4px 0"><strong>Email</strong></td><td>${payload.email}</td></tr>
            <tr><td style="padding:4px 12px 4px 0"><strong>WhatsApp</strong></td><td>${payload.whatsapp}</td></tr>
          </table>
          <p>Tim ChatHub akan menghubungi Anda kembali jika ada informasi lanjutan.</p>
          <p>Salam,<br />ChatHub</p>
        </div>
      `,
    });
  },
};
