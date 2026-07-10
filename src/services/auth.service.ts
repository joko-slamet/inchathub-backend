import { userService } from "./user.service";
import { verifyPassword } from "../utils/password";
import { signToken } from "../utils/jwt";
import { HttpError } from "../middlewares/errorHandler";

export const authService = {
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
