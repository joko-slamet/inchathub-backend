import { aiArticleConfigService, type InternalLink } from "../services/ai-article-config.service";
import { articleGenerationService } from "../services/article-generation.service";
import { getJakartaParts } from "../utils/jakarta-time";

const TICK_INTERVAL_MS = 60_000;

// In-memory guard against triggering the same day+time slot twice (e.g. if a
// tick runs slightly late/overlapping). Reset whenever the Jakarta calendar
// date changes, so it never grows unbounded.
const triggeredSlots = new Set<string>();
let lastSeenDate = "";

async function tick() {
  try {
    const config = await aiArticleConfigService.getOrCreate();
    if (!config.enabled) return;

    const { dateStr, timeStr, isWeekend } = getJakartaParts(new Date());

    if (dateStr !== lastSeenDate) {
      triggeredSlots.clear();
      lastSeenDate = dateStr;
    }

    if (!config.generateTimes.includes(timeStr)) return;

    const slotKey = `${dateStr}-${timeStr}`;
    if (triggeredSlots.has(slotKey)) return;
    triggeredSlots.add(slotKey);

    const topics = isWeekend ? config.weekendTopics : config.weekdayTopics;
    if (topics.length === 0) return;

    const topic = topics[Math.floor(Math.random() * topics.length)];
    const dayType = isWeekend ? "WEEKEND" : "WEEKDAY";

    const article = await articleGenerationService.generateAndSave(
      topic,
      dayType,
      config.prompt,
      config.internalLinks as InternalLink[],
    );
    const title = article.translations[0]?.title ?? article.slug;
    console.log(`[article-scheduler] generated "${title}" (${dayType}, topic: ${topic})`);
  } catch (err) {
    console.error("[article-scheduler] tick failed:", err);
  }
}

export function startArticleScheduler() {
  setInterval(tick, TICK_INTERVAL_MS);
  console.log("[article-scheduler] started — checking schedule every 60s (Asia/Jakarta time)");
}
