import { Router } from "express";
import { companyLogoController } from "../controllers/company-logo.controller";
import { Role } from "../generated/prisma/enums";
import { authenticate, authorize } from "../middlewares/auth";
import { uploadLogo } from "../middlewares/upload";
import { asyncHandler } from "../utils/asyncHandler";

export const companyLogoRouter = Router();

// Public — read by the landing page's Industries section. Must be registered
// before the admin-only routes below so they aren't caught by `authenticate`.
companyLogoRouter.get("/public", asyncHandler(companyLogoController.listPublic));

companyLogoRouter.get("/", authenticate, authorize(Role.ADMIN), asyncHandler(companyLogoController.list));
companyLogoRouter.post(
  "/",
  authenticate,
  authorize(Role.ADMIN),
  uploadLogo.single("logo"),
  asyncHandler(companyLogoController.create),
);
companyLogoRouter.delete(
  "/:id",
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(companyLogoController.remove),
);
