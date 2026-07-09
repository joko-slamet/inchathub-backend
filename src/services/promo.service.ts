import { unlink, mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { prisma } from "../config/prisma";
import { HttpError } from "../middlewares/errorHandler";
import { slugify } from "../utils/slug";
import type { PromoDiscountType } from "../generated/prisma/enums";

const UPLOADS_DIR = path.join(process.cwd(), "uploads", "promos");

export type PromoTranslationInput = {
  locale: string;
  title: string;
  excerpt: string;
  description: string;
};

async function uniquePromoSlug(title: string): Promise<string> {
  const base = slugify(title) || "promo";
  let slug = base;
  let suffix = 2;
  while (await prisma.promo.findUnique({ where: { slug } })) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  return slug;
}

// A promo is publicly visible only if the admin has it toggled active AND
// (if a validity window is set) the current time falls inside it — a
// startsAt/endsAt of null means no bound on that side ("lifetime" promo).
function publicWhere(now: Date) {
  return {
    isActive: true,
    AND: [
      { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
      { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
    ],
  };
}

export const promoService = {
  findAllPublic() {
    return prisma.promo.findMany({
      where: publicWhere(new Date()),
      orderBy: { sortOrder: "asc" },
      include: { translations: true },
    });
  },

  findAllAdmin() {
    return prisma.promo.findMany({
      orderBy: { sortOrder: "asc" },
      include: { translations: true },
    });
  },

  findPublicBySlug(slug: string) {
    return prisma.promo.findFirst({
      where: { slug, ...publicWhere(new Date()) },
      include: { translations: true },
    });
  },

  async create(data: {
    code: string;
    discountType: PromoDiscountType;
    discountValue: number;
    isActive: boolean;
    startsAt: Date | null;
    endsAt: Date | null;
    sortOrder: number;
    translations: PromoTranslationInput[];
    buffer: Buffer;
    extension: string;
  }) {
    const primary = data.translations.find((t) => t.locale === "id") ?? data.translations[0];
    const slug = await uniquePromoSlug(primary.title);

    const filename = `${randomUUID()}.${data.extension}`;
    await mkdir(UPLOADS_DIR, { recursive: true });
    await writeFile(path.join(UPLOADS_DIR, filename), data.buffer);

    return prisma.promo.create({
      data: {
        slug,
        code: data.code,
        imageUrl: `/uploads/promos/${filename}`,
        discountType: data.discountType,
        discountValue: data.discountValue,
        isActive: data.isActive,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        sortOrder: data.sortOrder,
        translations: {
          create: data.translations.map((t) => ({
            locale: t.locale,
            title: t.title,
            excerpt: t.excerpt,
            description: t.description,
          })),
        },
      },
      include: { translations: true },
    });
  },

  async update(
    id: string,
    data: {
      code?: string;
      discountType?: PromoDiscountType;
      discountValue?: number;
      isActive?: boolean;
      startsAt?: Date | null;
      endsAt?: Date | null;
      sortOrder?: number;
      translations?: PromoTranslationInput[];
      image?: { buffer: Buffer; extension: string };
    },
  ) {
    const existing = await prisma.promo.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "Promo not found");

    const { translations, image, ...promoData } = data;

    let imageUrl: string | undefined;
    if (image) {
      const filename = `${randomUUID()}.${image.extension}`;
      await mkdir(UPLOADS_DIR, { recursive: true });
      await writeFile(path.join(UPLOADS_DIR, filename), image.buffer);
      imageUrl = `/uploads/promos/${filename}`;
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (translations) {
        for (const t of translations) {
          await tx.promoTranslation.upsert({
            where: { promoId_locale: { promoId: id, locale: t.locale } },
            create: { promoId: id, locale: t.locale, title: t.title, excerpt: t.excerpt, description: t.description },
            update: { title: t.title, excerpt: t.excerpt, description: t.description },
          });
        }
      }

      return tx.promo.update({
        where: { id },
        data: { ...promoData, ...(imageUrl ? { imageUrl } : {}) },
        include: { translations: true },
      });
    });

    // Best-effort cleanup of the old file, only after the new one is
    // committed — an orphaned file on disk isn't worth failing the update.
    if (imageUrl) {
      const oldFilename = existing.imageUrl.split("/").pop();
      if (oldFilename) {
        await unlink(path.join(UPLOADS_DIR, oldFilename)).catch(() => undefined);
      }
    }

    return updated;
  },

  async remove(id: string) {
    const promo = await prisma.promo.findUnique({ where: { id } });
    if (!promo) throw new HttpError(404, "Promo not found");

    await prisma.promo.delete({ where: { id } });

    const filename = promo.imageUrl.split("/").pop();
    if (filename) {
      await unlink(path.join(UPLOADS_DIR, filename)).catch(() => undefined);
    }
  },
};
