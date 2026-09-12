"use client";
import { useEffect, useState } from "react";
import type { DailySource, Feed } from "./news";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
export default function Stream({ initial, dailySummary, dailySources }: {initial: Feed; dailySummary: string[]; dailySources: DailySource[]}) {
  const [feed, setFeed] = useState(initial);
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    async function update() {
      try {
        const response = await fetch("/api/news", {signal: controller.signal});
        if (!response.ok) throw new Error();
        setFeed(await response.json()); setOffline(false);
      } catch { if (!controller.signal.aborted) setOffline(true); }
    }
    const timer = setInterval(update, 300000);
    const visible = () => { if (document.visibilityState === "visible") update(); };
    document.addEventListener("visibilitychange", visible);
    return () => {controller.abort(); clearInterval(timer); document.removeEventListener("visibilitychange", visible);};
  }, []);
  return <main>
    <header><h1>AI News<span aria-hidden="true">/</span></h1></header>
    <section className="daily-brief" aria-label="Daily news summary">
      <div className="daily-copy">{dailySummary.slice(0, 2).map((sentence, index) => <p key={index}>{sentence}</p>)}</div>
      {dailySources.length > 0 && <div className="brief-sources" aria-label="Sources for the daily news summary">
        <span>Sources</span>
        {dailySources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">{source.label}</a>)}
      </div>}
    </section>
    {(offline || feed.unavailable.length > 0) && <p className="notice" role="status">{offline ? "Update failed." : feed.unavailable.join(" and ") + " could not be updated."} Showing saved links.</p>}
    <ul aria-label="Latest AI news">
      {feed.items.map(item => <li key={item.url}>
        <Dialog>
          <DialogTrigger asChild>
            <button className="news-row" type="button">
              <span className="headline">{item.title}</span>
              <span className="meta"><span>{item.source}</span><time dateTime={item.date}>{new Date(item.date).toLocaleDateString("en-US", {month:"short", day:"numeric", year: "numeric", timeZone:"UTC"})}</time></span>
            </button>
          </DialogTrigger>
          <DialogContent className="news-card">
            <DialogHeader>
              <DialogTitle>{item.title}</DialogTitle>
              <span className="meta"><span>{item.source}</span><time dateTime={item.date}>{new Date(item.date).toLocaleDateString("en-US", {month:"short", day:"numeric", year: "numeric", timeZone:"UTC"})}</time></span>
            </DialogHeader>
            <DialogDescription>{item.summary ?? "sorry, no summary yet."}</DialogDescription>
            <a className="article-link" href={item.url} target="_blank" rel="noopener noreferrer">Open article <span aria-hidden="true">↗</span></a>
          </DialogContent>
        </Dialog>
      </li>)}
    </ul>
    {!feed.items.length && <p className="notice">No news available.</p>}
  </main>;
}
