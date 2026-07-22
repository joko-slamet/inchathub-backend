-- CreateTable
CREATE TABLE "company_profiles" (
    "id" UUID NOT NULL,
    "mapSrc" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_profile_translations" (
    "id" UUID NOT NULL,
    "companyProfileId" UUID NOT NULL,
    "locale" TEXT NOT NULL,
    "paragraphs" TEXT[],
    "visionEyebrow" TEXT NOT NULL,
    "missionEyebrow" TEXT NOT NULL,
    "visionMain" TEXT NOT NULL,
    "visionAccent" TEXT NOT NULL,
    "missionItems" JSONB NOT NULL,
    "contactInfoCards" JSONB NOT NULL,

    CONSTRAINT "company_profile_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_settings" (
    "id" UUID NOT NULL,
    "locale" TEXT NOT NULL,
    "hero" JSONB NOT NULL,
    "problem" JSONB NOT NULL,
    "omnichannel" JSONB NOT NULL,
    "aiCrm" JSONB NOT NULL,
    "whyChatHub" JSONB NOT NULL,
    "industries" JSONB NOT NULL,
    "closingCta" JSONB NOT NULL,
    "faq" JSONB NOT NULL,
    "footer" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_profile_translations_companyProfileId_locale_key" ON "company_profile_translations"("companyProfileId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "site_settings_locale_key" ON "site_settings"("locale");

-- AddForeignKey
ALTER TABLE "company_profile_translations" ADD CONSTRAINT "company_profile_translations_companyProfileId_fkey" FOREIGN KEY ("companyProfileId") REFERENCES "company_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
