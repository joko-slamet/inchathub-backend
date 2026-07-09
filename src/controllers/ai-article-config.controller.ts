import type { Request, Response } from "express";
import { HttpError } from "../middlewares/errorHandler";
import { aiArticleConfigService, type InternalLink } from "../services/ai-article-config.service";

function parseStringArray(value: unknown, field: string): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((v) => typeof v !== "string")) {
    throw new HttpError(400, `${field} must be an array of strings`);
  }
  return value;
}

function isInternalLink(value: unknown): value is InternalLink {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as InternalLink).url === "string" &&
    typeof (value as InternalLink).description === "string"
  );
}

function parseInternalLinks(value: unknown): InternalLink[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || !value.every(isInternalLink)) {
    throw new HttpError(400, "internalLinks must be an array of { url, description }");
  }
  return value;
}

export const aiArticleConfigController = {
  async get(_req: Request, res: Response) {
    const config = await aiArticleConfigService.getOrCreate();
    res.json(config);
  },

  async update(req: Request, res: Response) {
    const { enabled, generateTimes, weekdayTopics, weekendTopics, prompt, internalLinks } = req.body ?? {};

    if (enabled !== undefined && typeof enabled !== "boolean") {
      throw new HttpError(400, "enabled must be a boolean");
    }
    if (prompt !== undefined && typeof prompt !== "string") {
      throw new HttpError(400, "prompt must be a string");
    }

    const config = await aiArticleConfigService.update({
      enabled,
      generateTimes: parseStringArray(generateTimes, "generateTimes"),
      weekdayTopics: parseStringArray(weekdayTopics, "weekdayTopics"),
      weekendTopics: parseStringArray(weekendTopics, "weekendTopics"),
      prompt,
      internalLinks: parseInternalLinks(internalLinks),
    });
    res.json(config);
  },
};
