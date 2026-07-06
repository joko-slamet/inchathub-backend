import type { Request, Response } from "express";
import { HttpError } from "../middlewares/errorHandler";
import { companyLogoService } from "../services/company-logo.service";
import { parseId } from "../utils/ids";

export const companyLogoController = {
  async listPublic(_req: Request, res: Response) {
    const logos = await companyLogoService.findAll();
    res.json(logos);
  },

  async list(_req: Request, res: Response) {
    const logos = await companyLogoService.findAll();
    res.json(logos);
  },

  async create(req: Request, res: Response) {
    const { name } = req.body ?? {};
    if (typeof name !== "string" || !name.trim()) {
      throw new HttpError(400, "name is required");
    }
    if (!req.file) {
      throw new HttpError(400, "logo file is required");
    }

    const logo = await companyLogoService.create({
      name,
      imageUrl: `/uploads/logos/${req.file.filename}`,
    });
    res.status(201).json(logo);
  },

  async remove(req: Request, res: Response) {
    const id = parseId(req.params.id);
    await companyLogoService.remove(id);
    res.status(204).send();
  },
};
