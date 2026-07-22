import type { Request, Response } from "express";
import { HttpError } from "../middlewares/errorHandler";
import { pricingService, type FeatureInput, type TranslationInput } from "../services/pricing.service";
import { parseId } from "../utils/ids";

function parseFeatures(features: unknown): FeatureInput[] {
  if (!Array.isArray(features)) {
    throw new HttpError(400, "translations[].features must be an array");
  }
  return features.map((f) => {
    if (typeof f !== "object" || f === null || typeof f.label !== "string" || typeof f.included !== "boolean") {
      throw new HttpError(400, "each feature requires { label: string, included: boolean, value?: string }");
    }
    return { label: f.label, included: f.included, value: typeof f.value === "string" ? f.value : undefined };
  });
}

function parseTranslations(translations: unknown, { requireAll }: { requireAll: boolean }): TranslationInput[] {
  if (!Array.isArray(translations) || (requireAll && translations.length === 0)) {
    throw new HttpError(400, "translations must be a non-empty array");
  }
  return translations.map((t) => {
    if (
      typeof t !== "object" ||
      t === null ||
      typeof t.locale !== "string" ||
      typeof t.name !== "string" ||
      typeof t.tagline !== "string"
    ) {
      throw new HttpError(400, "each translation requires { locale, name, tagline, features }");
    }
    return { locale: t.locale, name: t.name, tagline: t.tagline, features: parseFeatures(t.features) };
  });
}

function parsePrice(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new HttpError(400, `${field} must be a non-negative integer`);
  }
  return value;
}

export const pricingController = {
  async list(_req: Request, res: Response) {
    const plans = await pricingService.findAll();
    res.json(plans);
  },

  async getById(req: Request, res: Response) {
    const id = parseId(req.params.id);
    const plan = await pricingService.findById(id);
    if (!plan) throw new HttpError(404, "Pricing plan not found");
    res.json(plan);
  },

  async create(req: Request, res: Response) {
    const { key, sortOrder, popular, originalPrice, price, translations } = req.body ?? {};
    if (typeof key !== "string" || !key) {
      throw new HttpError(400, "key is required");
    }
    const plan = await pricingService.create({
      key,
      sortOrder: sortOrder !== undefined ? Number(sortOrder) : undefined,
      popular: Boolean(popular),
      originalPrice: parsePrice(originalPrice, "originalPrice"),
      price: parsePrice(price, "price"),
      translations: parseTranslations(translations, { requireAll: true }),
    });
    res.status(201).json(plan);
  },

  async update(req: Request, res: Response) {
    const id = parseId(req.params.id);
    const { key, sortOrder, popular, originalPrice, price, translations } = req.body ?? {};

    const plan = await pricingService.update(id, {
      key: typeof key === "string" ? key : undefined,
      sortOrder: sortOrder !== undefined ? Number(sortOrder) : undefined,
      popular: popular !== undefined ? Boolean(popular) : undefined,
      originalPrice: originalPrice !== undefined ? parsePrice(originalPrice, "originalPrice") : undefined,
      price: price !== undefined ? parsePrice(price, "price") : undefined,
      translations: translations !== undefined ? parseTranslations(translations, { requireAll: false }) : undefined,
    });
    res.json(plan);
  },

  async remove(req: Request, res: Response) {
    const id = parseId(req.params.id);
    await pricingService.remove(id);
    res.status(204).send();
  },
};
