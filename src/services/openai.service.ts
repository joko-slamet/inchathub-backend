import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env";
import { HttpError } from "../middlewares/errorHandler";
import type { InternalLink } from "./ai-article-config.service";

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_IMAGE_URL = "https://api.openai.com/v1/images/generations";
const UPLOADS_DIR = path.join(process.cwd(), "uploads", "articles");

function requireConfigured() {
  if (!env.openai.apiKey) {
    throw new HttpError(500, "OpenAI is not configured (missing OPENAI_API_KEY)");
  }
}

function headers() {
  return {
    Authorization: `Bearer ${env.openai.apiKey}`,
    "Content-Type": "application/json",
  };
}

// Keep in sync with `locales` in inchathub-frontend/content/types.ts — the
// backend has no shared package with the frontend, so this list is
// duplicated here deliberately.
const ARTICLE_LOCALES = ["id", "en"] as const;

// Randomly picked per generateImage() call so consecutive article covers
// don't all converge on the same composition — see the comment at that call
// site for why this exists.
const IMAGE_SCENES = [
  "a customer service agent smiling while using a headset and laptop in a bright, minimalist office",
  "close-up of a smartphone screen showing a busy chat conversation, held by someone in a co-working space",
  "a diverse small business team collaborating around a table with laptops and tablets in a sunlit office",
  "a professional working remotely from a cafe, on a video call on a laptop, warm natural window lighting",
  "an entrepreneur reviewing sales analytics on a tablet inside a modern retail store",
  "a busy customer support call center with agents wearing headsets, candid documentary photography style",
  "hands typing on a laptop keyboard with a blurred modern office background, shallow depth of field",
  "a small business owner checking a smartphone notification while packing orders in a cozy workspace",
  "two colleagues reviewing a dashboard on a large monitor together in a modern startup office",
  "a delivery courier checking an order confirmation on a smartphone outside a small shop",
];

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

type ChatCompletionResponse = {
  choices?: { message?: { content?: string }; finish_reason?: string }[];
  error?: { message?: string };
};

async function chatCompletion(systemPrompt: string, userContent: string): Promise<string> {
  const res = await fetch(OPENAI_CHAT_URL, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      model: env.openai.textModel,
      response_format: { type: "json_object" },
      // Two full locales x up to 10 paragraphs each, as JSON, comfortably
      // exceeds most providers' default completion cap — without this the
      // response gets cut off mid-string and JSON.parse fails below.
      max_completion_tokens: 6000,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    }),
  });

  const body = (await res.json().catch(() => null)) as ChatCompletionResponse | null;
  if (!res.ok) {
    throw new HttpError(502, body?.error?.message ?? "Failed to call OpenAI");
  }

  const choice = body?.choices?.[0];
  if (choice?.finish_reason === "length") {
    console.error("[openai] completion was truncated (finish_reason=length)");
    throw new HttpError(502, "OpenAI response was truncated before completing the article");
  }
  if (choice?.finish_reason === "content_filter") {
    throw new HttpError(502, "OpenAI declined to generate this article (content filter)");
  }

  const raw = choice?.message?.content;
  if (!raw) throw new HttpError(502, "OpenAI returned an empty response");
  return raw;
}

export const openaiService = {
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

    const raw = await chatCompletion(systemPrompt, `Topik artikel: ${topic}`);

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // response_format: json_object should guarantee valid JSON for a
      // successful generation, so a parse failure here almost always means
      // the completion got cut off mid-response (token limit).
      console.error("[openai] failed to parse article JSON, raw response:", raw);
      throw new HttpError(502, "OpenAI returned invalid JSON for the article");
    }

    const translations = (parsed as { translations?: unknown })?.translations;
    if (!Array.isArray(translations) || translations.length === 0 || !translations.every(isValidTranslation)) {
      throw new HttpError(502, "OpenAI article response is missing required translation fields");
    }

    return { translations };
  },

  // Rewrites an already-published article's text to address a prior SEO
  // audit's feedback, rather than generating fresh content — the model is
  // given the existing translations verbatim and told to preserve their
  // meaning, only changing what the feedback calls out.
  async reviseArticleSeo({
    topic,
    feedback,
    translations,
    internalLinks = [],
  }: {
    topic: string;
    feedback: string;
    translations: ArticleTranslationContent[];
    internalLinks?: InternalLink[];
  }): Promise<GeneratedArticleContent> {
    requireConfigured();

    const locales = translations.map((t) => t.locale);

    const internalLinksInstruction =
      internalLinks.length > 0
        ? `Kalau relevan dan belum ada, kamu BOLEH menyisipkan tautan internal markdown [teks](URL) ke dalam paragraf "content", tapi HANYA gunakan URL yang tercantum PERSIS di daftar berikut — jangan pernah mengarang atau mengubah URL:\n${internalLinks.map((l) => `- ${l.url}: ${l.description}`).join("\n")}`
        : null;

    const systemPrompt = [
      "Kamu adalah editor SEO untuk blog perusahaan ChatHub (platform omnichannel, AI chatbot, dan CRM).",
      "Tugasmu MEREVISI artikel yang SUDAH ADA agar skor SEO-nya naik pada audit berikutnya — bukan menulis artikel baru dari nol.",
      `Berikut feedback dari auditor SEO yang WAJIB kamu tindak lanjuti secara konkret: "${feedback}"`,
      "Perbaiki khususnya: penempatan kata kunci utama (topik) di judul, paragraf pembuka, dan tersebar wajar di isi tanpa keyword-stuffing; panjang judul idealnya 50-60 karakter; excerpt sebagai meta description idealnya 120-160 karakter; struktur paragraf dan keterbacaan; orisinalitas konten.",
      "JANGAN mengubah topik, fakta, atau maksud artikel, dan JANGAN memperpendek isi secara signifikan — pertahankan informasi yang sudah ada, cukup tulis ulang bagian yang perlu agar lebih SEO-friendly sambil tetap terbaca natural (bukan tulisan robotik/keyword-stuffing).",
      `Kembalikan revisi untuk PERSIS locale yang diberikan, tidak kurang tidak lebih: ${locales.join(", ")}. Setiap locale tetap harus jadi tulisan asli yang natural untuk bahasa itu, bukan terjemahan kaku dari locale lain.`,
      "Setiap paragraf di \"content\" HARUS berupa teks polos (plain text) — JANGAN gunakan markdown sama sekali (tanpa **bold**, *italic*, heading #, atau bullet list), kecuali format link internal di instruksi di bawah kalau ada.",
      internalLinksInstruction,
      "Balas HANYA dengan JSON valid tanpa markdown code fence, dengan bentuk persis:",
      `{"translations": [{"locale": string, "title": string, "excerpt": string, "content": string[]}, ...]}`,
    ]
      .filter(Boolean)
      .join(" ");

    const userContent = translations
      .map(
        (t) =>
          `Locale ${t.locale}:\nJudul (${t.title.length} karakter): ${t.title}\nExcerpt (${t.excerpt.length} karakter): ${t.excerpt}\nIsi artikel:\n${t.content.join("\n\n")}`,
      )
      .join("\n\n---\n\n");

    const raw = await chatCompletion(systemPrompt, `Topik artikel: ${topic}\n\n${userContent}`);

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error("[openai] failed to parse article revision JSON, raw response:", raw);
      throw new HttpError(502, "OpenAI returned invalid JSON for the article revision");
    }

    const revised = (parsed as { translations?: unknown })?.translations;
    if (!Array.isArray(revised) || revised.length === 0 || !revised.every(isValidTranslation)) {
      throw new HttpError(502, "OpenAI article revision response is missing required translation fields");
    }

    return { translations: revised };
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

    const raw = await chatCompletion(
      systemPrompt,
      `Topik: ${topic}\nJudul (${title.length} karakter): ${title}\nExcerpt (${excerpt.length} karakter): ${excerpt}\nIsi artikel:\n${content.join("\n\n")}`,
    );

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new HttpError(502, "OpenAI returned invalid JSON for the SEO score");
    }

    const { score, feedback } = parsed as { score?: unknown; feedback?: unknown };
    if (typeof score !== "number" || typeof feedback !== "string") {
      throw new HttpError(502, "OpenAI SEO score response is missing required fields");
    }

    return { score: Math.max(0, Math.min(100, Math.round(score))), feedback };
  },

  // Uses OpenAI's dedicated image generation endpoint (gpt-image-1), which
  // returns base64-encoded image data directly rather than a hosted URL.
  async generateImage({ title, topic }: { title: string; topic: string }): Promise<string> {
    requireConfigured();

    // A fixed style instruction ("editorial illustration style") made every
    // cover look identical regardless of topic — randomly picking one of
    // several realistic photographic scenes gives each generated article a
    // visually distinct cover while keeping brand color grading consistent.
    const scene = IMAGE_SCENES[Math.floor(Math.random() * IMAGE_SCENES.length)];

    const res = await fetch(OPENAI_IMAGE_URL, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        model: env.openai.imageModel,
        prompt: `Professional blog cover photo for an article titled "${title}" about "${topic}". Scene: ${scene}. Photorealistic professional photography — shot on a DSLR with natural lighting and shallow depth of field, editorial/corporate photography style. NOT an illustration, NOT a 3D render, NOT a cartoon or flat vector graphic. No text or letters anywhere in the image. Subtly incorporate the ChatHub brand's deep red (#be1e2d) as an accent within the scene (e.g. clothing, signage, or a UI screen visible in frame), with an overall neutral color grading of grays (#808184), near-black (#1a1618), and white.`,
        size: "1536x1024",
      }),
    });

    const body = (await res.json().catch(() => null)) as {
      data?: { b64_json?: string }[];
      error?: { message?: string };
    } | null;

    if (!res.ok) {
      throw new HttpError(502, body?.error?.message ?? "Failed to generate article image via OpenAI");
    }

    const base64 = body?.data?.[0]?.b64_json;
    if (!base64) {
      throw new HttpError(502, "OpenAI did not return an image for this article");
    }

    const filename = `${randomUUID()}.png`;

    await mkdir(UPLOADS_DIR, { recursive: true });
    await writeFile(path.join(UPLOADS_DIR, filename), Buffer.from(base64, "base64"));

    // Store just the relative path — the absolute URL is built at read time
    // (see articles.service.ts) using whatever API_PUBLIC_URL is *currently*
    // configured, so existing articles don't break if that value changes
    // later (e.g. a dev tunnel URL rotating).
    return `/uploads/articles/${filename}`;
  },
};
