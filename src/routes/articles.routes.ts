import { Router } from "express";
import { articlesController } from "../controllers/articles.controller";
import { Role } from "../generated/prisma/enums";
import { authenticate, authorize } from "../middlewares/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const articlesRouter = Router();

articlesRouter.use(authenticate, authorize(Role.ADMIN));

articlesRouter.get("/", asyncHandler(articlesController.list));
articlesRouter.post("/generate-now", asyncHandler(articlesController.generateNow));
articlesRouter.delete("/:id", asyncHandler(articlesController.remove));
