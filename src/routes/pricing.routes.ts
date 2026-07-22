import { Router } from "express";
import { pricingController } from "../controllers/pricing.controller";
import { Role } from "../generated/prisma/enums";
import { authenticate, authorize } from "../middlewares/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const pricingRouter = Router();

pricingRouter.get("/", asyncHandler(pricingController.list));
pricingRouter.get("/:id", asyncHandler(pricingController.getById));
pricingRouter.post("/", authenticate, authorize(Role.ADMIN), asyncHandler(pricingController.create));
pricingRouter.patch("/:id", authenticate, authorize(Role.ADMIN), asyncHandler(pricingController.update));
pricingRouter.delete("/:id", authenticate, authorize(Role.ADMIN), asyncHandler(pricingController.remove));
