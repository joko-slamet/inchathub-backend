-- CreateEnum
CREATE TYPE "public"."PromoDiscountType" AS ENUM ('FIXED', 'PERCENTAGE');

-- CreateTable
CREATE TABLE "public"."promos" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "discountType" "public"."PromoDiscountType" NOT NULL,
    "discountValue" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."promo_translations" (
    "id" UUID NOT NULL,
    "promoId" UUID NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "promo_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "promos_slug_key" ON "public"."promos"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "promos_code_key" ON "public"."promos"("code");

-- CreateIndex
CREATE UNIQUE INDEX "promo_translations_promoId_locale_key" ON "public"."promo_translations"("promoId", "locale");

-- AddForeignKey
ALTER TABLE "public"."promo_translations" ADD CONSTRAINT "promo_translations_promoId_fkey" FOREIGN KEY ("promoId") REFERENCES "public"."promos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

