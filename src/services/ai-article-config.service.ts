import { prisma } from "../config/prisma";

export type InternalLink = { url: string; description: string };

const defaultConfig = {
  enabled: true,
  generateTimes: ["08:00"],
  weekdayTopics: ["Omnichannel messaging", "WhatsApp Business API", "AI chatbot", "CRM", "Layanan pelanggan"],
  weekendTopics: ["Produktivitas kerja", "Tren teknologi sehari-hari", "Gaya hidup tim kantoran"],
  prompt:
    "Tulis dengan gaya bahasa yang santai tapi tetap informatif, gunakan Bahasa Indonesia, dan sertakan call-to-action untuk mencoba ChatHub di bagian akhir artikel.",
  internalLinks: [] as InternalLink[],
};

export type AiArticleConfigInput = {
  enabled?: boolean;
  generateTimes?: string[];
  weekdayTopics?: string[];
  weekendTopics?: string[];
  prompt?: string;
  internalLinks?: InternalLink[];
};

export const aiArticleConfigService = {
  // AiArticleConfig is a singleton — there's only ever one row. This is a
  // convention enforced here in the service layer, not a DB constraint.
  async getOrCreate() {
    const existing = await prisma.aiArticleConfig.findFirst();
    if (existing) return existing;
    return prisma.aiArticleConfig.create({ data: defaultConfig });
  },

  async update(data: AiArticleConfigInput) {
    const config = await this.getOrCreate();
    return prisma.aiArticleConfig.update({ where: { id: config.id }, data });
  },
};
