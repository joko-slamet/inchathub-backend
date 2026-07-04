import type { Request, Response } from "express";
import { articlesService } from "../services/articles.service";
import { parseId } from "../utils/ids";

export const articlesController = {
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
