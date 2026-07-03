-- CreateTable
CREATE TABLE "pricing_plans" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "popular" BOOLEAN NOT NULL DEFAULT false,
    "originalPrice" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_plan_translations" (
    "id" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "features" JSONB NOT NULL,

    CONSTRAINT "pricing_plan_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pricing_plans_key_key" ON "pricing_plans"("key");

-- CreateIndex
CREATE UNIQUE INDEX "pricing_plan_translations_planId_locale_key" ON "pricing_plan_translations"("planId", "locale");

-- AddForeignKey
ALTER TABLE "pricing_plan_translations" ADD CONSTRAINT "pricing_plan_translations_planId_fkey" FOREIGN KEY ("planId") REFERENCES "pricing_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
