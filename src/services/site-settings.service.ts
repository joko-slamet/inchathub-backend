import { prisma } from "../config/prisma";
import type { Prisma } from "../generated/prisma/client";

export type SiteSettingSections = {
  hero: Prisma.InputJsonValue;
  problem: Prisma.InputJsonValue;
  omnichannel: Prisma.InputJsonValue;
  aiCrm: Prisma.InputJsonValue;
  whyChatHub: Prisma.InputJsonValue;
  industries: Prisma.InputJsonValue;
  closingCta: Prisma.InputJsonValue;
  faq: Prisma.InputJsonValue;
  footer: Prisma.InputJsonValue;
};

export const siteSettingsService = {
  findAll() {
    return prisma.siteSetting.findMany();
  },

  // One transaction per save — the admin UI edits both locales at once and
  // has a single "Simpan Perubahan" button, so both rows are always upserted
  // together.
  updateAll(byLocale: Record<string, SiteSettingSections>) {
    return prisma.$transaction(
      Object.entries(byLocale).map(([locale, sections]) =>
        prisma.siteSetting.upsert({
          where: { locale },
          create: { locale, ...sections },
          update: sections,
        }),
      ),
    );
  },
};
