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

export const articlesController = {
  // Public — every generated article is visible on the public blog, there's
  // no draft/review state (yet), so this currently returns the same data as
  // the admin list.
  async listPublic(_req: Request, res: Response) {
    const articles = await articlesService.findAll();
    res.json(articles);
  },

  async getPublicBySlug(req: Request, res: Response) {
    const slug = parseSlug(req.params.slug);
    const article = await articlesService.findBySlug(slug);
    if (!article) throw new HttpError(404, "Article not found");
    res.json(article);
  },

  async recordView(req: Request, res: Response) {
    const slug = parseSlug(req.params.slug);
    await articlesService.incrementView(slug);
    res.status(204).send();
  },

  async list(_req: Request, res: Response) {
    const articles = await articlesService.findAll();
    res.json(articles);
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
