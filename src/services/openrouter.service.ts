import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env";
import { HttpError } from "../middlewares/errorHandler";
import type { InternalLink } from "./ai-article-config.service";

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
  async generateArticle({
    topic,
    prompt,
    internalLinks = [],
  }: {
    topic: string;
    prompt: string;
    internalLinks?: InternalLink[];
  }): Promise<GeneratedArticleContent> {
    requireConfigured();

    // The model only ever picks from this admin-curated list — it must never
    // invent its own href. article-generation.service.ts double-checks this
    // by stripping any link whose URL isn't an exact match before saving, so
    // a broken/hallucinated link can't reach the published article even if
    // the model doesn't follow this instruction.
    const internalLinksInstruction =
      internalLinks.length > 0
        ? `PENTING — TAUTAN INTERNAL WAJIB: kamu WAJIB menyisipkan minimal 1 (idealnya 2-3) tautan internal dari daftar di bawah ini ke dalam paragraf "content", di titik yang paling masuk akal secara konteks (termasuk kalimat call-to-action di akhir artikel — itu tempat yang sangat wajar untuk tautan seperti halaman harga). Hampir semua topik blog ChatHub bisa dikaitkan secara natural ke minimal satu tautan di daftar ini — HANYA lewati sepenuhnya kalau kamu benar-benar tidak menemukan satupun yang related. Format WAJIB persis markdown: [teks anchor](URL) — ditulis LANGSUNG menyatu di dalam kalimat paragraf, contoh konkret: "...jika Anda tertarik, [${internalLinks[0].description}](${internalLinks[0].url}) bisa jadi langkah selanjutnya." WAJIB hanya gunakan URL yang tercantum PERSIS di daftar ini — jangan pernah mengarang atau mengubah URL. Daftar tautan yang tersedia:\n${internalLinks.map((l) => `- ${l.url}: ${l.description}`).join("\n")} Ingat sekali lagi sebelum menulis: minimal satu paragraf "content" di SETIAP locale wajib mengandung tautan [teks](URL) dari daftar di atas.`
        : null;

    const systemPrompt = [
      "Kamu adalah penulis konten untuk blog perusahaan ChatHub (platform omnichannel, AI chatbot, dan CRM).",
      `Tulis artikel blog berdasarkan topik yang diberikan, dalam ${ARTICLE_LOCALES.length} bahasa sekaligus: ${ARTICLE_LOCALES.join(", ")} (kode locale ISO).`,
      "Setiap bahasa harus jadi tulisan asli yang natural untuk penutur bahasa itu, bukan terjemahan kaku kata-per-kata.",
      "Tulis dengan memperhatikan SEO: sertakan kata kunci utama (topik) di judul, di paragraf pembuka, dan sebar wajar di isi tanpa keyword-stuffing. Judul sebaiknya sekitar 50-60 karakter dan mengandung kata kunci. Excerpt berfungsi sebagai meta description, sebaiknya sekitar 120-160 karakter, ringkas, dan mengandung kata kunci.",
      "Panjang artikel WAJIB bervariasi mengikuti kedalaman topik — JANGAN selalu menulis jumlah paragraf/kata minimum di setiap artikel. Topik yang ringan/sederhana boleh 5-6 paragraf (total sekitar 400-500 kata), tapi topik yang lebih dalam, teknis, atau perlu penjelasan langkah-demi-langkah WAJIB ditulis lebih panjang dan lengkap, 8-10 paragraf (total sekitar 700-1000 kata). Setiap paragraf idealnya 60-100 kata yang substantif, bukan 2-3 kalimat pendek.",
      "Setiap paragraf di \"content\" HARUS berupa teks polos (plain text) — JANGAN gunakan markdown sama sekali (tanpa **bold**, *italic*, heading #, atau bullet list). Satu-satunya markup yang boleh dipakai adalah format link internal di instruksi di bawah, kalau ada.",
      prompt,
      // Placed right before the JSON format instruction (after the long
      // custom `prompt` above) rather than earlier — instructions near the
      // end of a long system prompt get followed more reliably than ones
      // buried before a big block of unrelated custom instructions.
      internalLinksInstruction,
      "Balas HANYA dengan JSON valid tanpa markdown code fence, dengan bentuk persis:",
      `{"translations": [{"locale": string (salah satu dari ${ARTICLE_LOCALES.join("/")}), "title": string, "excerpt": string (1-2 kalimat ringkasan), "content": string[] (5-10 paragraf isi artikel, jumlah & panjang menyesuaikan kedalaman topik sesuai instruksi di atas)}, ...]}`,
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
        // Two full locales x up to 10 paragraphs each, as JSON, comfortably
        // exceeds most providers' default completion cap — without this the
        // response gets cut off mid-string and JSON.parse fails below.
        max_tokens: 6000,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Topik artikel: ${topic}` },
        ],
      }),
    });
    const body = (await res.json().catch(() => null)) as {
      choices?: { message?: { content?: string }; finish_reason?: string; error?: unknown }[];
      error?: { message?: string };
    } | null;
    if (!res.ok) {
      throw new HttpError(502, body?.error?.message ?? "Failed to generate article text via OpenRouter");
    }

    // OpenRouter can return HTTP 200 while a per-choice generation still
    // failed upstream (e.g. the provider errored out) — finish_reason
    // "error" with a populated `error` field, and message.content left as
    // a leftover fragment (which would otherwise fail JSON.parse below with
    // a confusing "invalid JSON" message that hides the real cause).
    const choice = body?.choices?.[0];
    if (choice?.finish_reason === "error" || choice?.error) {
      console.error("[openrouter] provider returned a generation error:", JSON.stringify(choice?.error));
      throw new HttpError(502, `OpenRouter provider error while generating the article: ${JSON.stringify(choice?.error)}`);
    }

    const raw = choice?.message?.content;
    if (!raw) throw new HttpError(502, "OpenRouter returned an empty article response");

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // response_format: json_object should guarantee valid JSON for a
      // successful generation, so a parse failure here (after the error
      // check above already ruled out a provider-side error) almost always
      // means the completion got cut off mid-response (token limit).
      console.error("[openrouter] failed to parse article JSON, raw response:", raw);
      throw new HttpError(502, "OpenRouter returned invalid JSON for the article");
    }

    const translations = (parsed as { translations?: unknown })?.translations;
    if (!Array.isArray(translations) || translations.length === 0 || !translations.every(isValidTranslation)) {
      throw new HttpError(502, "OpenRouter article response is missing required translation fields");
    }

    return { translations };
  },

  // Separate call from generateArticle (fresh context, "reviewer" persona)
  // rather than asking the writer model to grade its own output in the same
  // completion — a model self-scoring inline tends to be overly generous.
  async scoreArticleSeo({
    title,
    excerpt,
    content,
    topic,
  }: {
    title: string;
    excerpt: string;
    content: string[];
    topic: string;
  }): Promise<{ score: number; feedback: string }> {
    requireConfigured();

    const systemPrompt = [
      "Kamu adalah SEO auditor untuk blog perusahaan. Tugasmu menilai SEO dari satu artikel yang SUDAH ditulis, bukan menulis ulang.",
      "Nilai berdasarkan kriteria SEO berikut: (1) penempatan kata kunci utama di judul, paragraf pembuka, dan tersebar wajar di isi tanpa keyword-stuffing, (2) panjang & daya tarik judul untuk title tag (idealnya sekitar 50-60 karakter, mengandung kata kunci), (3) excerpt sebagai meta description (idealnya sekitar 120-160 karakter, ringkas, mengandung kata kunci), (4) struktur paragraf dan keterbacaan, (5) orisinalitas konten (tidak generik/template).",
      "PENTING: jumlah karakter judul dan excerpt sudah dihitungkan secara pasti dan disertakan di pesan user (bukan perkiraan). Gunakan angka itu apa adanya untuk menilai kriteria (2) dan (3) — jangan mengira-ngira ulang panjangnya sendiri dari teks.",
      "Balas HANYA dengan JSON valid tanpa markdown code fence, dengan bentuk persis:",
      '{"score": number (0-100, skor SEO keseluruhan), "feedback": string (2-4 kalimat saran perbaikan SEO yang konkret dan actionable, dalam Bahasa Indonesia)}',
    ].join(" ");

    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        model: env.openrouter.textModel,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Topik: ${topic}\nJudul (${title.length} karakter): ${title}\nExcerpt (${excerpt.length} karakter): ${excerpt}\nIsi artikel:\n${content.join("\n\n")}`,
          },
        ],
      }),
    });

    const body = (await res.json().catch(() => null)) as {
      choices?: { message?: { content?: string }; finish_reason?: string; error?: unknown }[];
      error?: { message?: string };
    } | null;

    if (!res.ok) {
      throw new HttpError(502, body?.error?.message ?? "Failed to score article SEO via OpenRouter");
    }

    const scoreChoice = body?.choices?.[0];
    if (scoreChoice?.finish_reason === "error" || scoreChoice?.error) {
      throw new HttpError(502, `OpenRouter provider error while scoring SEO: ${JSON.stringify(scoreChoice?.error)}`);
    }

    const raw = scoreChoice?.message?.content;
    if (!raw) throw new HttpError(502, "OpenRouter returned an empty SEO score response");

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new HttpError(502, "OpenRouter returned invalid JSON for the SEO score");
    }

    const { score, feedback } = parsed as { score?: unknown; feedback?: unknown };
    if (typeof score !== "number" || typeof feedback !== "string") {
      throw new HttpError(502, "OpenRouter SEO score response is missing required fields");
    }

    return { score: Math.max(0, Math.min(100, Math.round(score))), feedback };
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
            content: `Generate a professional blog cover image for an article titled "${title}" about "${topic}". Modern, clean, editorial illustration style. No text or letters in the image. Color palette must match the ChatHub brand: deep red (#be1e2d) as the dominant accent color, combined with neutral grays (#808184), near-black (#1a1618), and white`,
          },
        ],
      }),
    });

    const body = (await res.json().catch(() => null)) as {
      choices?: {
        message?: { images?: { image_url?: { url?: string } }[] };
        finish_reason?: string;
        error?: unknown;
      }[];
      error?: { message?: string };
    } | null;

    if (!res.ok) {
      throw new HttpError(502, body?.error?.message ?? "Failed to generate article image via OpenRouter");
    }

    const imageChoice = body?.choices?.[0];
    if (imageChoice?.finish_reason === "error" || imageChoice?.error) {
      throw new HttpError(502, `OpenRouter provider error while generating the image: ${JSON.stringify(imageChoice?.error)}`);
    }

    const dataUrl = imageChoice?.message?.images?.[0]?.image_url?.url;
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
