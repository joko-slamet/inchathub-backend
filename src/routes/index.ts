import { Router } from "express";
import { authRouter } from "./auth.routes";
import { healthRouter } from "./health.routes";
import { orderRouter } from "./order.routes";
import { pricingRouter } from "./pricing.routes";
import { userRouter } from "./user.routes";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/users", userRouter);
apiRouter.use("/pricing-plans", pricingRouter);
apiRouter.use("/orders", orderRouter);
