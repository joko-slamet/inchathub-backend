import type { Role } from "../generated/prisma/enums";
import { prisma } from "../config/prisma";
import { hashPassword } from "../utils/password";

const publicSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  planExpiresAt: true,
  activePlan: {
    select: { id: true, key: true, translations: true },
  },
  createdAt: true,
  updatedAt: true,
} as const;

export const userService = {
  findAll() {
    return prisma.user.findMany({ orderBy: { id: "asc" }, select: publicSelect });
  },

  findById(id: string) {
    return prisma.user.findUnique({ where: { id }, select: publicSelect });
  },

  findByEmailWithPassword(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  async create(data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    role?: Role;
  }) {
    const password = await hashPassword(data.password);
    return prisma.user.create({ data: { ...data, password }, select: publicSelect });
  },

  async update(
    id: string,
    data: {
      name?: string;
      email?: string;
      password?: string;
      phone?: string;
      role?: Role;
    },
  ) {
    const password = data.password ? await hashPassword(data.password) : undefined;
    return prisma.user.update({
      where: { id },
      data: { ...data, password },
      select: publicSelect,
    });
  },

  remove(id: string) {
    return prisma.user.delete({ where: { id } });
  },
};
