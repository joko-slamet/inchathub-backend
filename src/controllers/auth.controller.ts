import type { Request, Response } from "express";
import { env } from "../config/env";
import { AUTH_COOKIE_NAME } from "../middlewares/auth";
import { HttpError } from "../middlewares/errorHandler";
import { authService } from "../services/auth.service";
import { userService } from "../services/user.service";

const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function setAuthCookie(res: Response, token: string) {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: env.nodeEnv === "production" ? "none" : "lax",
    maxAge: COOKIE_MAX_AGE_MS,
  });
}

export const authController = {
  async login(req: Request, res: Response) {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      throw new HttpError(400, "email and password are required");
    }
    const { user, token } = await authService.login(email, password);
    setAuthCookie(res, token);
    res.json({ user, token });
  },

  async logout(_req: Request, res: Response) {
    res.clearCookie(AUTH_COOKIE_NAME);
    res.status(204).send();
  },

  async me(req: Request, res: Response) {
    const user = await userService.findById(req.user!.sub);
    if (!user) throw new HttpError(404, "User not found");
    res.json(user);
  },
};
