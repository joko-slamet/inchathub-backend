import type { Request, Response } from "express";
import { HttpError } from "../middlewares/errorHandler";
import { articlesService } from "../services/articles.service";
import { parseId } from "../utils/ids";

function parseSlug(slug: unknown): string {
  if (typeof slug !== "string" || !slug) {
    throw new HttpError(400, "Invalid slug");
  }
  return slug;
}

function parseArticleTranslations(
  value: unknown,
): { locale: string; title: string; excerpt: string; content: string[] }[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new HttpError(400, "translations must be a non-empty array");
  }
  return value.map((t) => {
    if (
      typeof t !== "object" ||
      t === null ||
      typeof t.locale !== "string" ||
      typeof t.title !== "string" ||
      typeof t.excerpt !== "string" ||
      !Array.isArray(t.content) ||
      !t.content.every((p: unknown) => typeof p === "string")
    ) {
      throw new HttpError(400, "each translation requires { locale, title, excerpt, content: string[] }");
    }
    return { locale: t.locale, title: t.title, excerpt: t.excerpt, content: t.content as string[] };
  });
}

const DEFAULT_RELATED_LIMIT = 3;
const MAX_RELATED_LIMIT = 12;
const DEFAULT_PAGE_SIZE = 9;
const MAX_PAGE_SIZE = 50;

function parseLimit(value: unknown, fallback: number, max: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new HttpError(400, "limit must be a positive integer");
  }
  return Math.min(parsed, max);
}

function parsePage(value: unknown): number {
  if (value === undefined) return 1;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new HttpError(400, "page must be a positive integer");
  }
  return parsed;
}

async function sendPage(res: Response, page: number, limit: number) {
  const { data, total } = await articlesService.findPage(page, limit);
  res.json({ data, total, page, totalPages: Math.max(1, Math.ceil(total / limit)) });
}

export const articlesController = {
  // Public — every generated article is visible on the public blog, there's
  // no draft/review state (yet), so this currently returns the same data as
  // the admin list.
  // Backward compatible: with no `page`/`limit` query params, returns the
  // full array exactly as before (used by the homepage's blog teaser, which
  // only needs a handful of the latest posts and slices client-side).
  // Passing `page` switches to a paginated envelope — used by the /blog list
  // page so it fetches one page of articles at a time instead of every one.
  async listPublic(req: Request, res: Response) {
    if (req.query.page === undefined && req.query.limit === undefined) {
      const articles = await articlesService.findAll();
      res.json(articles);
      return;
    }

    await sendPage(res, parsePage(req.query.page), parseLimit(req.query.limit, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE));
  },

  async getPublicBySlug(req: Request, res: Response) {
    const slug = parseSlug(req.params.slug);
    const article = await articlesService.findBySlug(slug);
    if (!article) throw new HttpError(404, "Article not found");
    res.json(article);
  },

  async listRelated(req: Request, res: Response) {
    const slug = parseSlug(req.params.slug);
    const limit = parseLimit(req.query.limit, DEFAULT_RELATED_LIMIT, MAX_RELATED_LIMIT);
    const articles = await articlesService.findRelated(slug, limit);
    res.json(articles);
  },

  async recordView(req: Request, res: Response) {
    const slug = parseSlug(req.params.slug);
    await articlesService.incrementView(slug);
    res.status(204).send();
  },

  // Admin list — always paginated (unlike listPublic, this has a single
  // caller: the admin blog panel), so it never has to load every article at
  // once as the archive grows.
  async list(req: Request, res: Response) {
    await sendPage(res, parsePage(req.query.page), parseLimit(req.query.limit, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE));
  },

  async getOne(req: Request, res: Response) {
    const id = parseId(req.params.id);
    const article = await articlesService.findById(id);
    if (!article) throw new HttpError(404, "Article not found");
    res.json(article);
  },

  async update(req: Request, res: Response) {
    const id = parseId(req.params.id);
    const translations = parseArticleTranslations(req.body?.translations);
    const article = await articlesService.updateTranslations(id, translations);
    res.json(article);
  },

  async remove(req: Request, res: Response) {
    const id = parseId(req.params.id);
    await articlesService.remove(id);
    res.status(204).send();
  },

  async generateNow(_req: Request, res: Response) {
    const article = await articlesService.generateNow();
    res.status(201).json(article);
  },
};
