import type { Request, Response } from "express";
import { HttpError } from "../middlewares/errorHandler";
import { siteSettingsService, type SiteSettingSections } from "../services/site-settings.service";

const SECTION_KEYS: (keyof SiteSettingSections)[] = [
  "hero",
  "problem",
  "omnichannel",
  "aiCrm",
  "whyChatHub",
  "industries",
  "closingCta",
  "faq",
  "footer",
];

// Validation here is intentionally shallow (each section must be present and
// be an object, not a deep per-field schema) — this is admin-only content,
// matching the validation depth used elsewhere (e.g. ai-article-config).
function parseSections(value: unknown): SiteSettingSections {
  if (typeof value !== "object" || value === null) {
    throw new HttpError(400, "Each locale's settings must be an object");
  }
  const obj = value as Record<string, unknown>;

  for (const key of SECTION_KEYS) {
    if (typeof obj[key] !== "object" || obj[key] === null) {
      throw new HttpError(400, `Missing or invalid section: ${key}`);
    }
  }

  return obj as unknown as SiteSettingSections;
}

export const siteSettingsController = {
  async list(_req: Request, res: Response) {
    const settings = await siteSettingsService.findAll();
    res.json(settings);
  },

  async update(req: Request, res: Response) {
    const body = req.body;
    if (typeof body !== "object" || body === null || Array.isArray(body) || Object.keys(body).length === 0) {
      throw new HttpError(400, "Request body must be an object keyed by locale");
    }

    const byLocale: Record<string, SiteSettingSections> = {};
    for (const [locale, sections] of Object.entries(body)) {
      byLocale[locale] = parseSections(sections);
    }

    const settings = await siteSettingsService.updateAll(byLocale);
    res.json(settings);
  },
};
