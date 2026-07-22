import type { Request, Response } from "express";
import { HttpError } from "../middlewares/errorHandler";
import {
  companyProfileService,
  type CompanyProfileTranslationInput,
} from "../services/company-profile.service";

// Validation here is intentionally shallow (right shape/types, not a deep
// per-field schema) — this is admin-only content, matching the validation
// depth already used in ai-article-config.controller.ts.
function parseTranslation(value: unknown): CompanyProfileTranslationInput {
  if (typeof value !== "object" || value === null) {
    throw new HttpError(400, "Each translation must be an object");
  }
  const t = value as Record<string, unknown>;

  if (
    typeof t.locale !== "string" ||
    !Array.isArray(t.paragraphs) ||
    typeof t.visionEyebrow !== "string" ||
    typeof t.missionEyebrow !== "string" ||
    typeof t.visionMain !== "string" ||
    typeof t.visionAccent !== "string" ||
    !Array.isArray(t.missionItems) ||
    !Array.isArray(t.contactInfoCards)
  ) {
    throw new HttpError(400, "Translation is missing required fields");
  }

  return t as CompanyProfileTranslationInput;
}

export const companyProfileController = {
  async get(_req: Request, res: Response) {
    const profile = await companyProfileService.find();
    res.json(profile);
  },

  async update(req: Request, res: Response) {
    const { mapSrc, translations } = req.body ?? {};

    if (typeof mapSrc !== "string") {
      throw new HttpError(400, "mapSrc is required");
    }
    if (!Array.isArray(translations) || translations.length === 0) {
      throw new HttpError(400, "translations must be a non-empty array");
    }

    const profile = await companyProfileService.update({
      mapSrc,
      translations: translations.map(parseTranslation),
    });
    res.json(profile);
  },
};
