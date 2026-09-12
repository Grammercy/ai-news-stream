import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { clean, parseNews, sources } from "../app/news-parser.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const snapshotPath = resolve(root, "app/news-snapshot.json");
const summariesPath = resolve(root, "app/news-summaries.json");
const reviewsPath = resolve(root, "app/news-summary-reviews.json");
const briefPath = resolve(root, "app/daily-brief.json");
const headers = {
  "User-Agent": "Mozilla/5.0 (compatible; AINewsReader/1.0)",
  Accept: "application/rss+xml, text/html, */*",
};
const NEWS_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const isRecent = (date) => {
  const timestamp = Date.parse(date);
  return timestamp >= Date.now() - NEWS_RETENTION_MS && timestamp <= Date.now();
};

function canonical(url) {
  const value = new URL(url);
  value.hash = "";
  value.search = "";
  return value.href.replace(/\/$/, "");
}

function htmlAttribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "i"))?.[2] ?? "";
}

function descriptions(html) {
  const values = [];
  for (const tag of html.matchAll(/<meta\b[^>]*>/gi)) {
    const key = htmlAttribute(tag[0], "name") || htmlAttribute(tag[0], "property");
    if (/^(description|og:description|twitter:description)$/i.test(key)) values.push(clean(htmlAttribute(tag[0], "content")));
  }
  for (const match of html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) values.push(clean(match[1]));
  return [...new Set(values)].filter(value => value.length >= 45 && !/^(accept|cookie|privacy|subscribe|sign up)/i.test(value));
}

function firstSentence(text) {
  const normalized = unslop(clean(text).replace(/\s+/g, " ").trim());
  const match = normalized.match(/^(.{45,360}?[.!?])(?:\s|$)/);
  const sentence = (match?.[1] ?? normalized).trim();
  if (sentence.length < 45 || sentence.length > 360) return null;
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
}

function unslop(text) {
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, ",")
    .replace(/\bAdditionally\b/gi, "Also")
    .replace(/\bcrucial\b/gi, "important")
    .replace(/\bdelve\b/gi, "explore")
    .replace(/\benduring\b/gi, "lasting")
    .replace(/\benhance\b/gi, "improve")
    .replace(/\bfostering\b/gi, "helping")
    .replace(/\bgarner\b/gi, "receive")
    .replace(/\binterplay\b/gi, "relationship")
    .replace(/\bintricate\b/gi, "complex")
    .replace(/\blandscape\b/gi, "field")
    .replace(/\bpivotal\b/gi, "key")
    .replace(/\bshowcase\b/gi, "show")
    .replace(/\btapestry\b/gi, "mix")
    .replace(/\btestament\b/gi, "proof")
    .replace(/\bunderscore\b/gi, "show")
    .replace(/,\s*not just in ([^,]+), but in ([^.]+)\./gi, " in $1 and $2.")
    .replace(/\s*:\s*/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
}

async function getJson(path, fallback) {
  try { return JSON.parse(await readFile(path, "utf8")); } catch { return fallback; }
}

async function fetchText(url) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return { body: await response.text(), url: response.url };
}

const unavailable = [];
const sourceResults = await Promise.all(Object.entries(sources).map(async ([source, url]) => {
  try {
    const { body } = await fetchText(url);
    return parseNews(body, source).filter(item => isRecent(item.date)).slice(0, 40);
  } catch (error) {
    unavailable.push(`${source} feed (${error.message})`);
    return [];
  }
}));

const items = [...new Map(sourceResults.flat().map(item => [canonical(item.url), {...item, url: canonical(item.url)}])).values()]
  .sort((a, b) => b.date.localeCompare(a.date));
if (!items.length) throw new Error("No official releases were available; existing data was left untouched.");

const existing = await getJson(summariesPath, {});
const summaries = {};
for (const item of items) {
  const summary = existing[canonical(item.url)] ?? existing[item.url];
  if (summary) summaries[canonical(item.url)] = summary;
}

const existingReviews = await getJson(reviewsPath, {});
const reviews = Object.fromEntries(items
  .map(item => [canonical(item.url), existingReviews[canonical(item.url)] ?? existingReviews[item.url]])
  .filter(([, review]) => review && isRecent(review.date)));

const brief = await getJson(briefPath, []);

await mkdir(dirname(snapshotPath), {recursive: true});
await writeFile(snapshotPath, `${JSON.stringify(items, null, 2)}\n`);
await writeFile(summariesPath, `${JSON.stringify(summaries, null, 2)}\n`);
await writeFile(reviewsPath, `${JSON.stringify(reviews, null, 2)}\n`);
await writeFile(briefPath, `${JSON.stringify(brief, null, 2)}\n`);
console.log(JSON.stringify({items: items.length, summaries: Object.keys(summaries).length, missing: items.filter(item => !summaries[canonical(item.url)]).length, unavailable, brief}, null, 2));
