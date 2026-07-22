import type { Request, Response } from "express";
import { HttpError } from "../middlewares/errorHandler";
import { promoService, type PromoTranslationInput } from "../services/promo.service";
import { detectImageType } from "../utils/image-type";
import { parseId } from "../utils/ids";
import { PromoDiscountType } from "../generated/prisma/enums";

function parseTranslations(value: unknown, { requireAll }: { requireAll: boolean }): PromoTranslationInput[] {
  let parsed: unknown = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new HttpError(400, "translations must be valid JSON");
    }
  }
  if (!Array.isArray(parsed) || (requireAll && parsed.length === 0)) {
    throw new HttpError(400, "translations must be a non-empty array");
  }
  return parsed.map((t) => {
    if (
      typeof t !== "object" ||
      t === null ||
      typeof t.locale !== "string" ||
      typeof t.title !== "string" ||
      typeof t.excerpt !== "string" ||
      typeof t.description !== "string"
    ) {
      throw new HttpError(400, "each translation requires { locale, title, excerpt, description }");
    }
    return { locale: t.locale, title: t.title, excerpt: t.excerpt, description: t.description };
  });
}

function parseDiscountType(value: unknown): PromoDiscountType {
  if (value !== PromoDiscountType.FIXED && value !== PromoDiscountType.PERCENTAGE) {
    throw new HttpError(400, `discountType must be one of: ${Object.values(PromoDiscountType).join(", ")}`);
  }
  return value;
}

function parseDiscountValue(value: unknown): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) {
    throw new HttpError(400, "discountValue must be a non-negative integer");
  }
  return n;
}

function parseOptionalDate(value: unknown): Date | null {
  if (value === undefined || value === null || value === "") return null;
  const d = new Date(value as string);
  if (Number.isNaN(d.getTime())) throw new HttpError(400, "invalid date");
  return d;
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === "true" || value === true;
}

export const promoController = {
  async listPublic(_req: Request, res: Response) {
    const promos = await promoService.findAllPublic();
    res.json(promos);
  },

  async getPublicBySlug(req: Request, res: Response) {
    const slug = req.params.slug;
    if (typeof slug !== "string" || !slug) throw new HttpError(400, "Invalid slug");
    const promo = await promoService.findPublicBySlug(slug);
    if (!promo) throw new HttpError(404, "Promo not found");
    res.json(promo);
  },

  async list(_req: Request, res: Response) {
    const promos = await promoService.findAllAdmin();
    res.json(promos);
  },

  async create(req: Request, res: Response) {
    const { code, discountType, discountValue, isActive, startsAt, endsAt, sortOrder, translations } = req.body ?? {};

    if (typeof code !== "string" || !code.trim()) {
      throw new HttpError(400, "code is required");
    }
    if (!req.file) {
      throw new HttpError(400, "image file is required");
    }
    const detected = detectImageType(req.file.buffer);
    if (!detected) {
      throw new HttpError(400, "File must be a valid PNG, JPG, or WEBP image");
    }

    const promo = await promoService.create({
      code: code.trim(),
      discountType: parseDiscountType(discountType),
      discountValue: parseDiscountValue(discountValue),
      isActive: parseBoolean(isActive, true),
      startsAt: parseOptionalDate(startsAt),
      endsAt: parseOptionalDate(endsAt),
      sortOrder: sortOrder !== undefined ? Number(sortOrder) : 0,
      translations: parseTranslations(translations, { requireAll: true }),
      buffer: req.file.buffer,
      extension: detected.ext,
    });
    res.status(201).json(promo);
  },

  async update(req: Request, res: Response) {
    const id = parseId(req.params.id);
    const { code, discountType, discountValue, isActive, startsAt, endsAt, sortOrder, translations } = req.body ?? {};

    let image: { buffer: Buffer; extension: string } | undefined;
    if (req.file) {
      const detected = detectImageType(req.file.buffer);
      if (!detected) {
        throw new HttpError(400, "File must be a valid PNG, JPG, or WEBP image");
      }
      image = { buffer: req.file.buffer, extension: detected.ext };
    }

    const promo = await promoService.update(id, {
      code: typeof code === "string" && code.trim() ? code.trim() : undefined,
      discountType: discountType !== undefined ? parseDiscountType(discountType) : undefined,
      discountValue: discountValue !== undefined ? parseDiscountValue(discountValue) : undefined,
      isActive: isActive !== undefined ? parseBoolean(isActive, true) : undefined,
      startsAt: startsAt !== undefined ? parseOptionalDate(startsAt) : undefined,
      endsAt: endsAt !== undefined ? parseOptionalDate(endsAt) : undefined,
      sortOrder: sortOrder !== undefined ? Number(sortOrder) : undefined,
      translations: translations !== undefined ? parseTranslations(translations, { requireAll: false }) : undefined,
      image,
    });
    res.json(promo);
  },

  async remove(req: Request, res: Response) {
    const id = parseId(req.params.id);
    await promoService.remove(id);
    res.status(204).send();
  },
};
