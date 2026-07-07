import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth";
import { forgotPasswordLimiter, loginLimiter, registerLimiter } from "../middlewares/rate-limit";
import { asyncHandler } from "../utils/asyncHandler";

export const authRouter = Router();

authRouter.post("/register", registerLimiter, asyncHandler(authController.register));
authRouter.post("/login", loginLimiter, asyncHandler(authController.login));
authRouter.post("/logout", asyncHandler(authController.logout));
authRouter.post("/forgot-password", forgotPasswordLimiter, asyncHandler(authController.forgotPassword));
authRouter.post("/reset-password", asyncHandler(authController.resetPassword));
authRouter.get("/me", authenticate, asyncHandler(authController.me));
