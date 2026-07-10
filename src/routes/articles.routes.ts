import { Router } from "express";
import { articlesController } from "../controllers/articles.controller";
import { Role } from "../generated/prisma/enums";
import { authenticate, authorize } from "../middlewares/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const articlesRouter = Router();

// Public — read by the public blog pages. Must be registered before the
// admin-only routes below so they aren't caught by `authenticate`.
articlesRouter.get("/public", asyncHandler(articlesController.listPublic));
articlesRouter.get("/public/:slug", asyncHandler(articlesController.getPublicBySlug));
articlesRouter.get("/public/:slug/related", asyncHandler(articlesController.listRelated));
articlesRouter.post("/public/:slug/view", asyncHandler(articlesController.recordView));

articlesRouter.get("/", authenticate, authorize(Role.ADMIN), asyncHandler(articlesController.list));
articlesRouter.post(
  "/generate-now",
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(articlesController.generateNow),
);
articlesRouter.delete(
  "/:id",
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(articlesController.remove),
);
