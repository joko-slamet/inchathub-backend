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
      subject: "Registrasi Webinar Berhasil!",
      text: [
        `Halo, ${payload.name},`,
        "",
        "Terima kasih telah mendaftar di webinar kami. 🎉",
        "",
        "Registrasi Anda berhasil dicatat sebagai berikut:",
        "",
        `* Nama           : ${payload.name}`,
        `* Email                            : ${payload.email}`,
        `* WhatsApp                   : ${payload.whatsapp}`,
        `* Kota                              : ${payload.city}`,
        "",
        "Informasi Penting",
        "Link Zoom akan kami kirimkan melalui WhatsApp pada hari pelaksanaan webinar. Mohon dipastikan nomor WhatsApp Anda aktif agar tidak ketinggalan informasi.",
        "",
        "---",
        "",
        "Sekilas ChatHub",
        "Webinar ini dipersembahkan oleh ChatHub, platform Omnichannel yang mengintegrasikan WhatsApp, Instagram, Facebook, Telegram, Email, Live Chat, dan berbagai channel lainnya ke dalam satu dashboard.",
        "",
        "Dilengkapi dengan AI Chatbot dan Smart CRM, ChatHub membantu perusahaan:",
        "",
        "* Melayani pelanggan 24/7 secara otomatis.",
        "* Mempercepat respons tanpa menambah beban tim.",
        "* Mengelola seluruh percakapan pelanggan dari satu platform yang terintegrasi.",
        "",
        "Semoga webinar ini memberikan insight bermanfaat dan dapat membantu transformasi komunikasi bisnis Anda.",
        "",
        "Sampai jumpa di webinar!",
        "",
        "Salam hangat,",
        "Chat Hub Team",
        "0857-0555-0436",
      ].join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1a1618">
          <p>Halo, <strong>${payload.name}</strong>,</p>
          <p>Terima kasih telah mendaftar di webinar kami. 🎉</p>
          <p>Registrasi Anda berhasil dicatat sebagai berikut:</p>
          <table style="border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:4px 20px 4px 0"><strong>Nama</strong></td><td>${payload.name}</td></tr>
            <tr><td style="padding:4px 20px 4px 0"><strong>Email</strong></td><td>${payload.email}</td></tr>
            <tr><td style="padding:4px 20px 4px 0"><strong>WhatsApp</strong></td><td>${payload.whatsapp}</td></tr>
            <tr><td style="padding:4px 20px 4px 0"><strong>Kota</strong></td><td>${payload.city}</td></tr>
          </table>
          <div style="background:#f9f9f9;border-left:4px solid #2563eb;padding:12px 16px;margin:20px 0;border-radius:4px">
            <p style="margin:0 0 8px 0;font-weight:bold">Informasi Penting</p>
            <p style="margin:0">Link Zoom akan kami kirimkan melalui WhatsApp pada hari pelaksanaan webinar. Mohon dipastikan nomor WhatsApp Anda aktif agar tidak ketinggalan informasi.</p>
          </div>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0" />
          <p style="font-weight:bold;margin-bottom:8px">Sekilas ChatHub</p>
          <p>Webinar ini dipersembahkan oleh ChatHub, platform Omnichannel yang mengintegrasikan WhatsApp, Instagram, Facebook, Telegram, Email, Live Chat, dan berbagai channel lainnya ke dalam satu dashboard.</p>
          <p>Dilengkapi dengan AI Chatbot dan Smart CRM, ChatHub membantu perusahaan:</p>
          <ul style="margin:8px 0 16px 20px;padding:0">
            <li style="margin-bottom:6px">Melayani pelanggan 24/7 secara otomatis.</li>
            <li style="margin-bottom:6px">Mempercepat respons tanpa menambah beban tim.</li>
            <li>Mengelola seluruh percakapan pelanggan dari satu platform yang terintegrasi.</li>
          </ul>
          <p>Semoga webinar ini memberikan insight bermanfaat dan dapat membantu transformasi komunikasi bisnis Anda.</p>
          <p>Sampai jumpa di webinar!</p>
          <p style="margin-top:24px">
            Salam hangat,<br />
            <strong>Chat Hub Team</strong><br />
            0857-0555-0436
          </p>
        </div>
      `,
    });
  },
};
