import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env";
import { HttpError } from "../middlewares/errorHandler";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const UPLOADS_DIR = path.join(process.cwd(), "uploads", "articles");

function requireConfigured() {
  if (!env.openrouter.apiKey) {
    throw new HttpError(500, "OpenRouter is not configured (missing OPENROUTER_API_KEY)");
  }
}

function headers() {
  return {
    Authorization: `Bearer ${env.openrouter.apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": env.clientOrigin,
    "X-Title": "ChatHub Blog",
  };
}

// Keep in sync with `locales` in inchathub-frontend/content/types.ts — the
// backend has no shared package with the frontend, so this list is
// duplicated here deliberately.
const ARTICLE_LOCALES = ["id", "en"] as const;

export type ArticleTranslationContent = {
  locale: string;
  title: string;
  excerpt: string;
  content: string[];
};

export type GeneratedArticleContent = {
  translations: ArticleTranslationContent[];
};

function isValidTranslation(value: unknown): value is ArticleTranslationContent {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as ArticleTranslationContent).locale === "string" &&
    typeof (value as ArticleTranslationContent).title === "string" &&
    typeof (value as ArticleTranslationContent).excerpt === "string" &&
    Array.isArray((value as ArticleTranslationContent).content) &&
    (value as ArticleTranslationContent).content.length > 0
  );
}

export const openrouterService = {
  async generateArticle({ topic, prompt }: { topic: string; prompt: string }): Promise<GeneratedArticleContent> {
    requireConfigured();

    const systemPrompt = [
      "Kamu adalah penulis konten untuk blog perusahaan ChatHub (platform omnichannel, AI chatbot, dan CRM).",
      `Tulis artikel blog berdasarkan topik yang diberikan, dalam ${ARTICLE_LOCALES.length} bahasa sekaligus: ${ARTICLE_LOCALES.join(", ")} (kode locale ISO).`,
      "Setiap bahasa harus jadi tulisan asli yang natural untuk penutur bahasa itu, bukan terjemahan kaku kata-per-kata.",
      prompt,
      "Balas HANYA dengan JSON valid tanpa markdown code fence, dengan bentuk persis:",
      `{"translations": [{"locale": string (salah satu dari ${ARTICLE_LOCALES.join("/")}), "title": string, "excerpt": string (1-2 kalimat ringkasan), "content": string[] (4-6 paragraf isi artikel)}, ...]}`,
    ]
      .filter(Boolean)
      .join(" ");
    console.log(systemPrompt)
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        model: env.openrouter.textModel,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Topik artikel: ${topic}` },
        ],
      }),
    });
    console.log(res)
    const body = (await res.json().catch(() => null)) as {
      choices?: { message?: { content?: string } }[];
      error?: { message?: string };
    } | null;
    console.log(body)
    if (!res.ok) {
      throw new HttpError(502, body?.error?.message ?? "Failed to generate article text via OpenRouter");
    }

    const raw = body?.choices?.[0]?.message?.content;
    if (!raw) throw new HttpError(502, "OpenRouter returned an empty article response");

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new HttpError(502, "OpenRouter returned invalid JSON for the article");
    }

    const translations = (parsed as { translations?: unknown })?.translations;
    if (!Array.isArray(translations) || translations.length === 0 || !translations.every(isValidTranslation)) {
      throw new HttpError(502, "OpenRouter article response is missing required translation fields");
    }

    return { translations };
  },

  // Uses an image-output-capable model via the same chat completions endpoint
  // (modalities: ["image", "text"]). Verify this request/response shape
  // against current OpenRouter docs if the chosen model changes — image
  // generation support and field names vary more across providers/models
  // than plain text chat does.
  async generateImage({ title, topic }: { title: string; topic: string }): Promise<string> {
    requireConfigured();

    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        model: env.openrouter.imageModel,
        modalities: ["image", "text"],
        messages: [
          {
            role: "user",
            content: `Generate a professional blog cover image for an article titled "${title}" about "${topic}". Modern, clean, editorial illustration style. No text or letters in the image.`,
          },
        ],
      }),
    });

    const body = (await res.json().catch(() => null)) as {
      choices?: { message?: { images?: { image_url?: { url?: string } }[] } }[];
      error?: { message?: string };
    } | null;

    if (!res.ok) {
      throw new HttpError(502, body?.error?.message ?? "Failed to generate article image via OpenRouter");
    }

    const dataUrl = body?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!dataUrl || !dataUrl.startsWith("data:image/")) {
      throw new HttpError(502, "OpenRouter did not return an image for this article");
    }

    const [meta, base64] = dataUrl.split(",");
    const extension = /data:image\/(\w+);base64/.exec(meta)?.[1] ?? "png";
    const filename = `${randomUUID()}.${extension}`;

    await mkdir(UPLOADS_DIR, { recursive: true });
    await writeFile(path.join(UPLOADS_DIR, filename), Buffer.from(base64, "base64"));

    // Store just the relative path — the absolute URL is built at read time
    // (see articles.service.ts) using whatever API_PUBLIC_URL is *currently*
    // configured, so existing articles don't break if that value changes
    // later (e.g. a dev tunnel URL rotating).
    return `/uploads/articles/${filename}`;
  },
};
