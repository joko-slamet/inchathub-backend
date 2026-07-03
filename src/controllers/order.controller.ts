import type { Request, Response } from "express";
import { HttpError } from "../middlewares/errorHandler";
import { orderService } from "../services/order.service";
import { duitkuService, type DuitkuCallbackPayload } from "../services/duitku.service";
import { parseId } from "../utils/ids";

export const orderController = {
  async paymentMethods(req: Request, res: Response) {
    const { planId } = req.query;
    if (typeof planId !== "string" || !planId) {
      throw new HttpError(400, "planId query param is required");
    }
    const methods = await orderService.getPaymentMethods(planId);
    res.json(methods);
  },

  async create(req: Request, res: Response) {
    const { planId, paymentMethod } = req.body ?? {};
    if (typeof planId !== "string" || !planId) {
      throw new HttpError(400, "planId is required");
    }
    if (typeof paymentMethod !== "string" || !paymentMethod) {
      throw new HttpError(400, "paymentMethod is required");
    }
    const order = await orderService.create(req.user!.sub, planId, paymentMethod);
    res.status(201).json(order);
  },

  async getById(req: Request, res: Response) {
    const id = parseId(req.params.id);
    const order = await orderService.findById(id);
    if (!order) throw new HttpError(404, "Order not found");
    if (order.userId !== req.user!.sub && req.user!.role !== "ADMIN") {
      throw new HttpError(403, "Insufficient permissions");
    }
    res.json(order);
  },

  async duitkuCallback(req: Request, res: Response) {
    const payload = req.body as DuitkuCallbackPayload;

    if (!duitkuService.verifyCallback(payload)) {
      throw new HttpError(400, "Invalid signature");
    }

    if (payload.resultCode === "00") {
      await orderService.markPaidByMerchantOrderId(payload.merchantOrderId!);
    } else {
      await orderService.markFailedByMerchantOrderId(payload.merchantOrderId!);
    }

    // Duitku expects a plain "OK" response, not JSON.
    res.status(200).send("OK");
  },
};
