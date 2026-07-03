import { Router } from "express";
import express from "express";
import { orderController } from "../controllers/order.controller";
import { Role } from "../generated/prisma/enums";
import { authenticate, authorize } from "../middlewares/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const orderRouter = Router();

// Public — just an informational fee list for a given plan, needed on the
// checkout page before the customer has an account. Must be registered
// before "/:id" so it isn't swallowed by that dynamic route.
orderRouter.get("/payment-methods", asyncHandler(orderController.paymentMethods));

// Must be registered before "/:id" so "mine" isn't parsed as an order id.
orderRouter.get("/mine", authenticate, asyncHandler(orderController.listMine));

orderRouter.get("/", authenticate, authorize(Role.ADMIN), asyncHandler(orderController.list));
orderRouter.post("/", authenticate, asyncHandler(orderController.create));
orderRouter.get("/:id", authenticate, asyncHandler(orderController.getById));

// Public — called server-to-server by Duitku, not by our own frontend.
// Duitku posts `application/x-www-form-urlencoded`, so this route needs its
// own body parser rather than relying on the app-wide express.json().
orderRouter.post(
  "/duitku-callback",
  express.urlencoded({ extended: true }),
  asyncHandler(orderController.duitkuCallback),
);
