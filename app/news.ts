import { parseNews, sources } from "./news-parser.mjs";
import updateStatus from "./update-status.json";
import snapshot from "./news-snapshot.json";
import summaries from "./news-summaries.json";
import dailyBrief from "./daily-brief.json";
import dailyBriefSources from "./daily-brief-sources.json";
export type Item = {title: string; url: string; date: string; source: string; summary?: string};
export type Feed = {items: Item[]; unavailable: string[]; checkedAt: number | null};
export type DailySource = {label: string; url: string};
const cache = new Map<string, {items: Item[]; expires: number}>();
const NEWS_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const isRecent = (date: string) => {
  const timestamp = Date.parse(date);
  return timestamp >= Date.now() - NEWS_RETENTION_MS && timestamp <= Date.now();
};
const canonical = (url: string) => {
  const value = new URL(url);
  value.hash = "";
  value.search = "";
  const normalized = value.href.replace(/\/$/, "");
  if (normalized === "https://deepmind.google/blog/introducing-gemini-38-live-with-live-avatar") {
    return "https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-8-live-with-live-avatar";
  }
  return normalized;
};
const summaryByUrl = Object.fromEntries(Object.entries(summaries as Record<string, string>).map(([url, summary]) => [canonical(url), summary]));
const uniqueByCanonical = (items: Item[]) => [...new Map(items.map(item => [canonical(item.url), item])).values()];
const withSummaries = (items: Item[]) => items.map(item => ({...item, summary: summaryByUrl[canonical(item.url)]}));
export const dailySummary = dailyBrief as string[];
export const dailySources = dailyBriefSources as DailySource[];
export async function getNews(): Promise<Feed> {
  const unavailable: string[] = [];
  const results = await Promise.all(Object.entries(sources).map(async ([source, url]) => {
    const saved = cache.get(source);
    const retained = [...(saved?.items ?? []), ...snapshot.filter(item => item.source === source)];
    if (saved && saved.expires > Date.now()) return saved.items;
    try {
      const response = await fetch(url as string, {headers: {"User-Agent": "Mozilla/5.0 (compatible; AINewsReader/1.0)", Accept: "application/rss+xml, text/html, */*"}, signal: AbortSignal.timeout(12000)});
      if (!response.ok) throw new Error("Source unavailable");
      const parsed = parseNews(await response.text(), source);
      const items: Item[] = withSummaries(uniqueByCanonical([...parsed, ...retained]).filter(item => isRecent(item.date)).sort((a,b) => b.date.localeCompare(a.date)));
      if (!parsed.length && !retained.length) throw new Error("Source format changed");
      cache.set(source, {items, expires: Date.now() + 300000});
      return items;
    } catch {
      unavailable.push(source);
      return withSummaries(uniqueByCanonical(retained).filter(item => isRecent(item.date)).sort((a,b) => b.date.localeCompare(a.date)));
    }
  }));
  const checkedAt = Date.parse(updateStatus.coverageThrough);
  return {checkedAt, items: results.flat().filter(item => isRecent(item.date)).sort((a,b) => b.date.localeCompare(a.date)), unavailable};
}
