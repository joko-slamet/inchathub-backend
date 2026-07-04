import { unlink } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../config/prisma";
import { HttpError } from "../middlewares/errorHandler";
import { aiArticleConfigService } from "./ai-article-config.service";
import { articleGenerationService } from "./article-generation.service";
import { getJakartaParts } from "../utils/jakarta-time";

const UPLOADS_DIR = path.join(process.cwd(), "uploads", "articles");

export const articlesService = {
  // imageUrl is returned exactly as stored — just the relative path (e.g.
  // "/uploads/articles/x.png"). The frontend prepends its own
  // NEXT_PUBLIC_BACKEND_URL to build the full URL, so this API never needs
  // to know which public host it's being reached through.
  findAll() {
    return prisma.article.findMany({
      orderBy: { generatedAt: "desc" },
      include: { translations: true },
    });
  },

  findBySlug(slug: string) {
    return prisma.article.findUnique({
      where: { slug },
      include: { translations: true },
    });
  },

  async remove(id: string) {
    const article = await prisma.article.findUnique({ where: { id } });
    if (!article) throw new HttpError(404, "Article not found");

    await prisma.article.delete({ where: { id } });

    // Best-effort cleanup — an orphaned file on disk isn't worth failing the
    // delete over.
    const filename = article.imageUrl.split("/").pop();
    if (filename) {
      await unlink(path.join(UPLOADS_DIR, filename)).catch(() => undefined);
    }
  },

  async generateNow() {
    const config = await aiArticleConfigService.getOrCreate();
    const { isWeekend } = getJakartaParts(new Date());
    const topics = isWeekend ? config.weekendTopics : config.weekdayTopics;

    if (topics.length === 0) {
      throw new HttpError(400, `No topics configured for ${isWeekend ? "weekend" : "weekday"}`);
    }

    const topic = topics[Math.floor(Math.random() * topics.length)];
    const dayType = isWeekend ? "WEEKEND" : "WEEKDAY";

    return articleGenerationService.generateAndSave(topic, dayType, config.prompt);
  },
};
