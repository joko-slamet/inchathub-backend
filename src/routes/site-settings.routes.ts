import { Router } from "express";
import { siteSettingsController } from "../controllers/site-settings.controller";
import { Role } from "../generated/prisma/enums";
import { authenticate, authorize } from "../middlewares/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const siteSettingsRouter = Router();

// Public — read by the public landing page. Must be registered before the
// admin-only route below so it isn't caught by `authenticate`. Reuses the
// same handler since the response contains no sensitive data.
siteSettingsRouter.get("/public", asyncHandler(siteSettingsController.list));

siteSettingsRouter.get(
  "/",
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(siteSettingsController.list),
);
siteSettingsRouter.put(
  "/",
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(siteSettingsController.update),
);
