import { unlink } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../config/prisma";
import { HttpError } from "../middlewares/errorHandler";
import { aiArticleConfigService, type InternalLink } from "./ai-article-config.service";
import { articleGenerationService } from "./article-generation.service";
import { openrouterService } from "./openrouter.service";
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

  // Powers the paginated /blog list page — queried a page at a time instead
  // of the page fetching every article and slicing client-side.
  async findPage(page: number, limit: number) {
    const [data, total] = await Promise.all([
      prisma.article.findMany({
        orderBy: { generatedAt: "desc" },
        include: { translations: true },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.article.count(),
    ]);
    return { data, total };
  },

  findBySlug(slug: string) {
    return prisma.article.findUnique({
      where: { slug },
      include: { translations: true },
    });
  },

  findById(id: string) {
    return prisma.article.findUnique({
      where: { id },
      include: { translations: true },
    });
  },

  async updateTranslations(
    id: string,
    translations: { locale: string; title: string; excerpt: string; content: string[] }[],
  ) {
    const existing = await prisma.article.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "Article not found");

    await prisma.$transaction(
      translations.map((t) =>
        prisma.articleTranslation.upsert({
          where: { articleId_locale: { articleId: id, locale: t.locale } },
          create: { articleId: id, locale: t.locale, title: t.title, excerpt: t.excerpt, content: t.content },
          update: { title: t.title, excerpt: t.excerpt, content: t.content },
        }),
      ),
    );

    // Re-score against the revised text so the admin can see whether the
    // edit actually improved on the AI's original feedback. Non-critical,
    // same as during generation — a scoring failure shouldn't stop the edit
    // from being saved.
    const primary = translations.find((t) => t.locale === "id") ?? translations[0];
    const seo = await openrouterService
      .scoreArticleSeo({ title: primary.title, excerpt: primary.excerpt, content: primary.content, topic: existing.topic })
      .catch((err) => {
        console.error("Failed to re-score article SEO:", err);
        return null;
      });

    return prisma.article.update({
      where: { id },
      data: seo ? { seoScore: seo.score, seoFeedback: seo.feedback } : {},
      include: { translations: true },
    });
  },

  // Powers the "related articles" strip on a blog detail page — queried
  // with a limit directly instead of the page fetching every article and
  // slicing client-side.
  findRelated(excludeSlug: string, limit: number) {
    return prisma.article.findMany({
      where: { slug: { not: excludeSlug } },
      orderBy: { generatedAt: "desc" },
      take: limit,
      include: { translations: true },
    });
  },

  // Best-effort — a missing article here just means the visitor hit a stale
  // link, not something worth surfacing as a hard error to the page.
  async incrementView(slug: string) {
    await prisma.article.updateMany({ where: { slug }, data: { viewCount: { increment: 1 } } });
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

    return articleGenerationService.generateAndSave(topic, dayType, config.prompt, config.internalLinks as InternalLink[]);
  },
};
