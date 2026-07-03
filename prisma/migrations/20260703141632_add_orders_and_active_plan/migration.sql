-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- AlterTable
ALTER TABLE "pricing_plans" ADD COLUMN     "durationDays" INTEGER NOT NULL DEFAULT 30;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "activePlanId" UUID,
ADD COLUMN     "planExpiresAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "merchantOrderId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "duitkuReference" TEXT,
    "paymentUrl" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_merchantOrderId_key" ON "orders"("merchantOrderId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_activePlanId_fkey" FOREIGN KEY ("activePlanId") REFERENCES "pricing_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_planId_fkey" FOREIGN KEY ("planId") REFERENCES "pricing_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
