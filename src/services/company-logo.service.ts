import { unlink } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../config/prisma";
import { HttpError } from "../middlewares/errorHandler";

const UPLOADS_DIR = path.join(process.cwd(), "uploads", "logos");

export const companyLogoService = {
  findAll() {
    return prisma.companyLogo.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  },

  create(data: { name: string; imageUrl: string }) {
    return prisma.companyLogo.create({ data });
  },

  async remove(id: string) {
    const logo = await prisma.companyLogo.findUnique({ where: { id } });
    if (!logo) throw new HttpError(404, "Company logo not found");

    await prisma.companyLogo.delete({ where: { id } });

    const filename = logo.imageUrl.split("/").pop();
    if (filename) {
      await unlink(path.join(UPLOADS_DIR, filename)).catch(() => undefined);
    }
  },
};
