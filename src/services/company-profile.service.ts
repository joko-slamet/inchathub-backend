import { prisma } from "../config/prisma";

export type CompanyProfileTranslationInput = {
  locale: string;
  paragraphs: string[];
  visionEyebrow: string;
  missionEyebrow: string;
  visionMain: string;
  visionAccent: string;
  missionItems: { textMain: string; textAccent: string }[];
  contactInfoCards: { label: string; value: string; href: string }[];
};

export type CompanyProfileInput = {
  mapSrc: string;
  translations: CompanyProfileTranslationInput[];
};

const withTranslations = { translations: true } as const;

export const companyProfileService = {
  find() {
    return prisma.companyProfile.findFirst({ include: withTranslations });
  },

  async update(data: CompanyProfileInput) {
    const existing = await prisma.companyProfile.findFirst();

    return prisma.$transaction(async (tx) => {
      const profile = existing
        ? await tx.companyProfile.update({ where: { id: existing.id }, data: { mapSrc: data.mapSrc } })
        : await tx.companyProfile.create({ data: { mapSrc: data.mapSrc } });

      for (const t of data.translations) {
        const fields = {
          paragraphs: t.paragraphs,
          visionEyebrow: t.visionEyebrow,
          missionEyebrow: t.missionEyebrow,
          visionMain: t.visionMain,
          visionAccent: t.visionAccent,
          missionItems: t.missionItems,
          contactInfoCards: t.contactInfoCards,
        };

        await tx.companyProfileTranslation.upsert({
          where: { companyProfileId_locale: { companyProfileId: profile.id, locale: t.locale } },
          create: { companyProfileId: profile.id, locale: t.locale, ...fields },
          update: fields,
        });
      }

      return tx.companyProfile.findUniqueOrThrow({ where: { id: profile.id }, include: withTranslations });
    });
  },
};
