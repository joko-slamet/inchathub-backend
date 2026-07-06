import { userService } from "./user.service";
import { verifyPassword } from "../utils/password";
import { signToken } from "../utils/jwt";
import { HttpError } from "../middlewares/errorHandler";
import { generateResetToken, hashToken } from "../utils/token";
import { sendMail } from "../utils/mailer";
import { env } from "../config/env";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export const authService = {
  async register(data: { name: string; email: string; password: string; phone?: string }) {
    const existing = await userService.findByEmailWithPassword(data.email);
    if (existing) {
      throw new HttpError(409, "Email is already registered");
    }
    const user = await userService.create(data);
    const token = signToken({ sub: user.id, role: user.role });
    return { user, token };
  },

  async login(email: string, password: string) {
    const user = await userService.findByEmailWithPassword(email);
    if (!user || !(await verifyPassword(password, user.password))) {
      throw new HttpError(401, "Invalid email or password");
    }
    const token = signToken({ sub: user.id, role: user.role });
    const { password: _password, ...publicUser } = user;
    return { user: publicUser, token };
  },

  async forgotPassword(email: string) {
    const user = await userService.findByEmailWithPassword(email);
    if (!user) {
      throw new HttpError(404, "Email tidak terdaftar");
    }

    const rawToken = generateResetToken();
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await userService.setResetToken(user.id, hashToken(rawToken), expiresAt);

    const resetUrl = `${env.clientOrigin}/reset-password?token=${rawToken}`;
    await sendMail({
      to: user.email,
      subject: "Reset password ChatHub",
      html: `<p>Kami menerima permintaan reset password untuk akun Anda.</p><p><a href="${resetUrl}">Klik di sini untuk membuat password baru</a>. Link ini berlaku selama 1 jam.</p><p>Jika Anda tidak meminta ini, abaikan email ini.</p>`,
    });
  },

  async resetPassword(token: string, newPassword: string) {
    const user = await userService.findByResetTokenHash(hashToken(token));
    if (!user) {
      throw new HttpError(400, "Token tidak valid atau sudah kedaluwarsa");
    }
    await userService.clearResetTokenAndSetPassword(user.id, newPassword);
  },
};
