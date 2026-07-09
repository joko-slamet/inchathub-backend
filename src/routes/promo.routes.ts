import { Router } from "express";
import { promoController } from "../controllers/promo.controller";
import { Role } from "../generated/prisma/enums";
import { authenticate, authorize } from "../middlewares/auth";
import { uploadPromoImage } from "../middlewares/upload";
import { asyncHandler } from "../utils/asyncHandler";

export const promoRouter = Router();

// Public — must be registered before the admin-only routes below so they
// aren't caught by `authenticate`.
promoRouter.get("/public", asyncHandler(promoController.listPublic));
promoRouter.get("/public/:slug", asyncHandler(promoController.getPublicBySlug));

promoRouter.get("/", authenticate, authorize(Role.ADMIN), asyncHandler(promoController.list));
promoRouter.post(
  "/",
  authenticate,
  authorize(Role.ADMIN),
  uploadPromoImage.single("image"),
  asyncHandler(promoController.create),
);
promoRouter.patch(
  "/:id",
  authenticate,
  authorize(Role.ADMIN),
  uploadPromoImage.single("image"),
  asyncHandler(promoController.update),
);
promoRouter.delete("/:id", authenticate, authorize(Role.ADMIN), asyncHandler(promoController.remove));
