import { parseNews, sources } from "./news-parser.mjs";
import snapshot from "./news-snapshot.json";
export type Item = {title: string; url: string; date: string; source: string};
export type Feed = {items: Item[]; unavailable: string[]};
const cache = new Map<string, {items: Item[]; expires: number}>();
export async function getNews(): Promise<Feed> {
  const unavailable: string[] = [];
  const results = await Promise.all(Object.entries(sources).map(async ([source, url]) => {
    const saved = cache.get(source);
    if (saved && saved.expires > Date.now()) return saved.items;
    try {
      const response = await fetch(url as string, {headers: {"User-Agent": "Mozilla/5.0 (compatible; AINewsReader/1.0)", Accept: "application/rss+xml, text/html, */*"}, signal: AbortSignal.timeout(12000)});
      if (!response.ok) throw new Error("Source unavailable");
      const items: Item[] = parseNews(await response.text(), source).slice(0, 40);
      if (!items.length) throw new Error("Source format changed");
      cache.set(source, {items, expires: Date.now() + 300000});
      return items;
    } catch {
      unavailable.push(source);
      return saved?.items ?? snapshot.filter(item => item.source === source);
    }
  }));
  return {items: results.flat().filter(item => Date.parse(item.date) <= Date.now()).sort((a,b) => b.date.localeCompare(a.date)), unavailable};
}
