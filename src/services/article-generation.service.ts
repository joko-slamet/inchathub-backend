import { prisma } from "../config/prisma";
import type { ArticleDayType } from "../generated/prisma/enums";
import { openrouterService } from "./openrouter.service";

function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function uniqueSlug(title: string): Promise<string> {
  const base = slugify(title) || "artikel";
  let slug = base;
  let suffix = 2;
  while (await prisma.article.findUnique({ where: { slug } })) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  return slug;
}

export const articleGenerationService = {
  async generateAndSave(topic: string, dayType: ArticleDayType, prompt: string) {
    const draft = await openrouterService.generateArticle({ topic, prompt });
    // "id" is the site's primary/default locale — used for the slug and as
    // the image prompt's context when present, falling back to whichever
    // translation the model returned first.
    const primary = draft.translations.find((t) => t.locale === "id") ?? draft.translations[0];

    // The article must always ship with an image — if generation fails here,
    // skip saving entirely rather than persisting an article without one.
    // The scheduler will simply try again at the next scheduled slot.
    const imageUrl = await openrouterService.generateImage({ title: primary.title, topic });

    const slug = await uniqueSlug(primary.title);

    return prisma.article.create({
      data: {
        slug,
        topic,
        dayType,
        imageUrl,
        translations: {
          create: draft.translations.map((t) => ({
            locale: t.locale,
            title: t.title,
            excerpt: t.excerpt,
            content: t.content,
          })),
        },
      },
      include: { translations: true },
    });
  },
};
