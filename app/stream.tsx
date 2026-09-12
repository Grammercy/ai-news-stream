"use client";
import { useEffect, useState } from "react";
import type { Feed } from "./news";
export default function Stream({ initial }: {initial: Feed}) {
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
    {(offline || feed.unavailable.length > 0) && <p className="notice" role="status">{offline ? "Update failed." : feed.unavailable.join(" and ") + " could not be updated."} Showing saved links.</p>}
    <ul aria-label="Latest AI news">
      {feed.items.map(item => <li key={item.url}>
        <a href={item.url} target="_blank" rel="noopener noreferrer">
          <span className="headline">{item.title}</span>
          <span className="meta"><span>{item.source}</span><time dateTime={item.date}>{new Date(item.date).toLocaleDateString("en-US", {month:"short", day:"numeric", year: "numeric", timeZone:"UTC"})}</time></span>
        </a>
      </li>)}
    </ul>
    {!feed.items.length && <p className="notice">No news available.</p>}
  </main>;
}
