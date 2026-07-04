import { Router } from "express";
import { companyProfileController } from "../controllers/company-profile.controller";
import { Role } from "../generated/prisma/enums";
import { authenticate, authorize } from "../middlewares/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const companyProfileRouter = Router();

// Public — read by the public about-us page. Must be registered before the
// admin-only route below so it isn't caught by `authenticate`. Reuses the
// same handler since the response contains no sensitive data.
companyProfileRouter.get("/public", asyncHandler(companyProfileController.get));

companyProfileRouter.get(
  "/",
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(companyProfileController.get),
);
companyProfileRouter.put(
  "/",
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(companyProfileController.update),
);
