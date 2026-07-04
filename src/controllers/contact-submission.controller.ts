import type { Request, Response } from "express";
import { HttpError } from "../middlewares/errorHandler";
import { contactSubmissionService } from "../services/contact-submission.service";

export const contactSubmissionController = {
  async create(req: Request, res: Response) {
    const { name, email, phone, message } = req.body ?? {};

    if (typeof name !== "string" || !name.trim()) {
      throw new HttpError(400, "name is required");
    }
    if (typeof email !== "string" || !email.trim()) {
      throw new HttpError(400, "email is required");
    }
    if (typeof message !== "string" || !message.trim()) {
      throw new HttpError(400, "message is required");
    }
    if (phone !== undefined && typeof phone !== "string") {
      throw new HttpError(400, "phone must be a string");
    }

    const submission = await contactSubmissionService.create({
      name,
      email,
      phone: phone || undefined,
      message,
    });
    res.status(201).json(submission);
  },

  async list(_req: Request, res: Response) {
    const submissions = await contactSubmissionService.findAll();
    res.json(submissions);
  },
};
