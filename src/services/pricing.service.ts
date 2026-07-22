import { prisma } from "../config/prisma";

export type FeatureInput = { label: string; value?: string; included: boolean };

export type TranslationInput = {
  locale: string;
  name: string;
  tagline: string;
  features: FeatureInput[];
};

const withTranslations = { translations: true } as const;

export const pricingService = {
  findAll() {
    return prisma.pricingPlan.findMany({
      orderBy: { sortOrder: "asc" },
      include: withTranslations,
    });
  },

  findById(id: string) {
    return prisma.pricingPlan.findUnique({ where: { id }, include: withTranslations });
  },

  create(data: {
    key: string;
    sortOrder?: number;
    popular?: boolean;
    originalPrice: number;
    price: number;
    translations: TranslationInput[];
  }) {
    return prisma.pricingPlan.create({
      data: {
        key: data.key,
        sortOrder: data.sortOrder ?? 0,
        popular: data.popular ?? false,
        originalPrice: data.originalPrice,
        price: data.price,
        translations: {
          create: data.translations.map((t) => ({
            locale: t.locale,
            name: t.name,
            tagline: t.tagline,
            features: t.features,
          })),
        },
      },
      include: withTranslations,
    });
  },

  async update(
    id: string,
    data: {
      key?: string;
      sortOrder?: number;
      popular?: boolean;
      originalPrice?: number;
      price?: number;
      translations?: TranslationInput[];
    },
  ) {
    const { translations, ...planData } = data;

    return prisma.$transaction(async (tx) => {
      if (translations) {
        for (const t of translations) {
          await tx.pricingPlanTranslation.upsert({
            where: { planId_locale: { planId: id, locale: t.locale } },
            create: { planId: id, locale: t.locale, name: t.name, tagline: t.tagline, features: t.features },
            update: { name: t.name, tagline: t.tagline, features: t.features },
          });
        }
      }

      return tx.pricingPlan.update({
        where: { id },
        data: planData,
        include: withTranslations,
      });
    });
  },

  remove(id: string) {
    return prisma.pricingPlan.delete({ where: { id } });
  },
};
