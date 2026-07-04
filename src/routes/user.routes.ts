import { Router } from "express";
import { userController } from "../controllers/user.controller";
import { authenticate, authorize } from "../middlewares/auth";
import { Role } from "../generated/prisma/enums";
import { asyncHandler } from "../utils/asyncHandler";

export const userRouter = Router();

userRouter.use(authenticate);

userRouter.get("/", authorize(Role.ADMIN), asyncHandler(userController.list));

// Must be registered before "/:id" so "customers" isn't parsed as a user id.
userRouter.get("/customers", authorize(Role.ADMIN), asyncHandler(userController.listCustomers));

userRouter.get("/:id", asyncHandler(userController.getById));
userRouter.post("/", authorize(Role.ADMIN), asyncHandler(userController.create));
userRouter.patch("/:id", asyncHandler(userController.update));
userRouter.delete("/:id", authorize(Role.ADMIN), asyncHandler(userController.remove));
