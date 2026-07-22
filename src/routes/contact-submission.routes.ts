import { Router } from "express";
import { contactSubmissionController } from "../controllers/contact-submission.controller";
import { Role } from "../generated/prisma/enums";
import { authenticate, authorize } from "../middlewares/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const contactSubmissionRouter = Router();

// Public — submitted by the /contact-us form, no account required.
contactSubmissionRouter.post("/", asyncHandler(contactSubmissionController.create));

contactSubmissionRouter.get(
  "/",
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(contactSubmissionController.list),
);
