import { randomUUID } from "node:crypto";
import { prisma } from "../config/prisma";
import { HttpError } from "../middlewares/errorHandler";
import { duitkuService } from "./duitku.service";
import { env } from "../config/env";

function generateMerchantOrderId(): string {
  return `INV-${Date.now()}-${randomUUID().slice(0, 8)}`;
}

export const orderService = {
  async findAllForAdmin() {
    return prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        plan: { include: { translations: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });
  },

  async findAllForUser(userId: string) {
    return prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { plan: { include: { translations: true } } },
    });
  },

  async findById(id: string) {
    return prisma.order.findUnique({
      where: { id },
      include: { plan: { include: { translations: true } } },
    });
  },

  async getPaymentMethods(planId: string) {
    const plan = await prisma.pricingPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new HttpError(404, "Pricing plan not found");
    return duitkuService.getPaymentMethods(plan.price);
  },

  async create(userId: string, planId: string, paymentMethod: string) {
    const [user, plan] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.pricingPlan.findUnique({ where: { id: planId } }),
    ]);

    if (!user) throw new HttpError(404, "User not found");
    if (!plan) throw new HttpError(404, "Pricing plan not found");

    const merchantOrderId = generateMerchantOrderId();

    const order = await prisma.order.create({
      data: {
        userId,
        planId,
        merchantOrderId,
        amount: plan.price,
        status: "PENDING",
      },
    });

    const transaction = await duitkuService.createTransaction({
      merchantOrderId,
      paymentAmount: plan.price,
      paymentMethod,
      productDetails: `ChatHub - ${plan.key}`,
      email: user.email,
      phoneNumber: user.phone ?? undefined,
      customerName: user.name,
      returnUrl: `${env.clientOrigin}/checkout/return?order=${order.id}`,
      callbackUrl: `${env.apiPublicUrl}/api/orders/duitku-callback`,
    });

    return prisma.order.update({
      where: { id: order.id },
      data: {
        duitkuReference: transaction.reference,
        paymentUrl: transaction.paymentUrl,
      },
    });
  },

  async markPaidByMerchantOrderId(merchantOrderId: string) {
    const order = await prisma.order.findUnique({
      where: { merchantOrderId },
      include: { plan: true },
    });
    if (!order) throw new HttpError(404, "Order not found");

    // Idempotent: Duitku may retry the callback; only apply the side effect once.
    if (order.status === "PAID") return order;

    const now = new Date();

    return prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: order.id },
        data: { status: "PAID", paidAt: now },
      });

      const user = await tx.user.findUnique({ where: { id: order.userId } });
      const base = user?.planExpiresAt && user.planExpiresAt > now ? user.planExpiresAt : now;
      const planExpiresAt = new Date(base.getTime() + order.plan.durationDays * 24 * 60 * 60 * 1000);

      await tx.user.update({
        where: { id: order.userId },
        data: { activePlanId: order.planId, planExpiresAt },
      });

      return updated;
    });
  },

  async markFailedByMerchantOrderId(merchantOrderId: string) {
    const order = await prisma.order.findUnique({ where: { merchantOrderId } });
    if (!order) throw new HttpError(404, "Order not found");
    if (order.status !== "PENDING") return order;
    return prisma.order.update({ where: { id: order.id }, data: { status: "FAILED" } });
  },
};
