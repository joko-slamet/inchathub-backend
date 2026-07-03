import { userService } from "./user.service";
import { verifyPassword } from "../utils/password";
import { signToken } from "../utils/jwt";
import { HttpError } from "../middlewares/errorHandler";

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
};
