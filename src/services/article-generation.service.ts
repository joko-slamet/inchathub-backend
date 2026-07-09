import { prisma } from "../config/prisma";
import type { ArticleDayType } from "../generated/prisma/enums";
import { openrouterService } from "./openrouter.service";
import { slugify } from "../utils/slug";
import type { InternalLink } from "./ai-article-config.service";

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

const MARKDOWN_LINK_PATTERN = /\[([^\]]+)\]\(([^)\s]+)\)/g;
const MARKDOWN_BOLD_PATTERN = /\*\*([^*]+)\*\*/g;
const MARKDOWN_ITALIC_PATTERN = /\*([^*]+)\*/g;

// Defense in depth against the model ignoring the "only use these exact
// URLs" instruction in the prompt — any markdown link whose href isn't an
// exact match against the admin's list is unwrapped back to plain text
// before the article is ever saved, so a hallucinated or broken link can
// never reach a published page.
function sanitizeInternalLinks(paragraphs: string[], allowedLinks: InternalLink[]): string[] {
  const allowedUrls = new Set(allowedLinks.map((l) => l.url));
  return paragraphs.map((paragraph) =>
    paragraph.replace(MARKDOWN_LINK_PATTERN, (match, text: string, url: string) =>
      allowedUrls.has(url) ? match : text,
    ),
  );
}

// Article paragraphs render as plain text on the frontend (see
// LinkifiedText, which only understands the link syntax above) — the model
// is told not to use markdown emphasis, but strip it here too in case it
// slips through anyway, so raw "**"/"*" never show up on the published page.
function stripMarkdownEmphasis(paragraphs: string[]): string[] {
  return paragraphs.map((paragraph) =>
    paragraph.replace(MARKDOWN_BOLD_PATTERN, "$1").replace(MARKDOWN_ITALIC_PATTERN, "$1"),
  );
}

export const articleGenerationService = {
  async generateAndSave(topic: string, dayType: ArticleDayType, prompt: string, internalLinks: InternalLink[] = []) {
    const draft = await openrouterService.generateArticle({ topic, prompt, internalLinks });
    draft.translations = draft.translations.map((t) => ({
      ...t,
      content: sanitizeInternalLinks(stripMarkdownEmphasis(t.content), internalLinks),
    }));
    // "id" is the site's primary/default locale — used for the slug and as
    // the image prompt's context when present, falling back to whichever
    // translation the model returned first.
    const primary = draft.translations.find((t) => t.locale === "id") ?? draft.translations[0];

    // The article must always ship with an image — if generation fails here,
    // skip saving entirely rather than persisting an article without one.
    // The scheduler will simply try again at the next scheduled slot.
    const imageUrl = await openrouterService.generateImage({ title: primary.title, topic });

    // Non-critical insight for the admin, not a requirement for the article
    // to be valid — unlike the cover image, a scoring failure shouldn't stop
    // the article from being saved.
    const seo = await openrouterService
      .scoreArticleSeo({ title: primary.title, excerpt: primary.excerpt, content: primary.content, topic })
      .catch((err) => {
        console.error("Failed to score article SEO:", err);
        return null;
      });

    const slug = await uniqueSlug(primary.title);

    return prisma.article.create({
      data: {
        slug,
        topic,
        dayType,
        imageUrl,
        seoScore: seo?.score ?? null,
        seoFeedback: seo?.feedback ?? null,
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
