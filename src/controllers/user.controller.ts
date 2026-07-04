import type { Request, Response } from "express";
import { Role } from "../generated/prisma/enums";
import { HttpError } from "../middlewares/errorHandler";
import { userService } from "../services/user.service";
import { parseId } from "../utils/ids";

function parseRole(role: unknown): Role | undefined {
  if (role === undefined) return undefined;
  if (!Object.values(Role).includes(role as Role)) {
    throw new HttpError(400, `role must be one of: ${Object.values(Role).join(", ")}`);
  }
  return role as Role;
}

function requireSelfOrAdmin(req: Request, id: string) {
  if (req.user?.role !== Role.ADMIN && req.user?.sub !== id) {
    throw new HttpError(403, "Insufficient permissions");
  }
}

export const userController = {
  async list(_req: Request, res: Response) {
    const users = await userService.findAll();
    res.json(users);
  },

  async listCustomers(_req: Request, res: Response) {
    const customers = await userService.findActiveCustomers();
    res.json(customers);
  },

  async getById(req: Request, res: Response) {
    const id = parseId(req.params.id);
    requireSelfOrAdmin(req, id);
    const user = await userService.findById(id);
    if (!user) throw new HttpError(404, "User not found");
    res.json(user);
  },

  async create(req: Request, res: Response) {
    const { name, email, password, phone, role } = req.body ?? {};
    if (!name || !email || !password) {
      throw new HttpError(400, "name, email and password are required");
    }
    const user = await userService.create({
      name,
      email,
      password,
      phone,
      role: parseRole(role),
    });
    res.status(201).json(user);
  },

  async update(req: Request, res: Response) {
    const id = parseId(req.params.id);
    requireSelfOrAdmin(req, id);
    const { name, email, password, phone, role } = req.body ?? {};
    if (role !== undefined && req.user?.role !== Role.ADMIN) {
      throw new HttpError(403, "Only admins can change roles");
    }
    const user = await userService.update(id, {
      name,
      email,
      password,
      phone,
      role: parseRole(role),
    });
    res.json(user);
  },

  async remove(req: Request, res: Response) {
    const id = parseId(req.params.id);
    await userService.remove(id);
    res.status(204).send();
  },
};
