
export const sources = {
  OpenAI: "https://openai.com/news/rss.xml",
  Anthropic: "https://www.anthropic.com/news",
  "Google DeepMind": "https://deepmind.google/blog/rss.xml",
  "Meta AI": "https://ai.meta.com/blog/",
  Mistral: "https://mistral.ai/news"
};
export function clean(text = "") {
  return text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]*>/g, " ").replace(/&#(x[0-9a-f]+|\d+);/gi, (_, n) => String.fromCodePoint(n[0].toLowerCase() === "x" ? parseInt(n.slice(1), 16) : Number(n))).replace(/&(amp|quot|apos|lt|gt|nbsp|rsquo|lsquo|rdquo|ldquo|ndash|mdash);/g, (_, n) => ({amp:"&",quot:'"',apos:"'",lt:"<",gt:">",nbsp:" ",rsquo:"’",lsquo:"‘",rdquo:"”",ldquo:"“",ndash:"–",mdash:"—"}[n])).replace(/\s+/g, " ").trim();
}
export function parseNews(body, source) {
  const items = [];
  const add = (title, link, date) => {
    try {
      const origin = new URL(sources[source]);
      const url = new URL(clean(link), origin);
      const timestamp = Date.parse(clean(date));
      if (url.protocol !== "https:" || url.hostname !== origin.hostname || !clean(title) || !Number.isFinite(timestamp)) return;
      items.push({title: clean(title), url: url.href, date: new Date(timestamp).toISOString(), source});
    } catch {}
  };
  if (source === "OpenAI" || source === "Google DeepMind") {
    for (const match of body.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
      const field = name => match[1].match(new RegExp("<"+name+"[^>]*>([\\s\\S]*?)<\\/"+name+">"))?.[1] || "";
      add(field("title"), field("link"), field("pubDate"));
    }
  } else {
    for (const match of body.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)) {
      const href = match[1].match(/href="([^"]+)"/)?.[1];
      let date = match[2].match(/<time\b[^>]*>([\s\S]*?)<\/time>/)?.[1];
      let title = match[2].match(/<h[234]\b[^>]*>([\s\S]*?)<\/h[234]>/)?.[1] || match[2].match(/<span[^>]*class="[^"]*__title[^"]*"[^>]*>([\s\S]*?)<\/span>/)?.[1];
      if (source === "Mistral") date = clean(match[2]).match(/\b(?:January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}\b/)?.[0];
      if (source === "Meta AI" && href?.startsWith("https://ai.meta.com/blog/") && !match[2].includes("<img")) {
        title = clean(match[2]);
        const following = body.slice(match.index + match[0].length, match.index + match[0].length + 180);
        date = clean(following.split("<a")[0]).match(/\b[A-Z][a-z]{2,8} \d{1,2}, \d{4}\b/)?.[0];
      }
      if (href && date && title) add(title, href, date);
    }
  }
  return [...new Map(items.map(item => [item.url, item])).values()].sort((a,b) => b.date.localeCompare(a.date));
}
