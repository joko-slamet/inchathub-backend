import { Router } from "express";
import { aiArticleConfigController } from "../controllers/ai-article-config.controller";
import { Role } from "../generated/prisma/enums";
import { authenticate, authorize } from "../middlewares/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const aiArticleConfigRouter = Router();

aiArticleConfigRouter.get(
  "/",
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(aiArticleConfigController.get),
);
aiArticleConfigRouter.put(
  "/",
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(aiArticleConfigController.update),
);
