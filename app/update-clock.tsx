"use client";
import { useEffect, useState } from "react";

function duration(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  if (seconds >= 3600) return `${Math.floor(seconds / 3600)}h${Math.floor(seconds % 3600 / 60).toString().padStart(2, "0")}`;
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;
}

export default function UpdateClock({ checkedAt, nextCheckAt }: { checkedAt: number | null; nextCheckAt: number | null }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const timer = setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", tick); };
  }, []);
  const elapsed = now !== null && checkedAt != null ? Math.max(0, now - checkedAt) : null;
  const remaining = now !== null && nextCheckAt !== null ? Math.max(0, nextCheckAt - now) : null;
  const progress = elapsed === null ? 0 : Math.min(1, elapsed / 300000);
  const date = new Date(now ?? 0);
  const minutes = date.getMinutes() + date.getSeconds() / 60;
  const hours = date.getHours() % 12 + minutes / 60;
  const since = elapsed === null ? "--:--" : duration(elapsed);
  const next = remaining === null ? "--:--" : duration(remaining);
  const description = `Since last source check: ${since}. Next check in ${next}. Blue shows elapsed coverage time over the five-minute refresh interval.`;
  return <div className="update-clock" role="img" aria-label={description} title={description}>
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="46" fill="white" stroke="#232934" strokeWidth="4" />
      <circle cx="50" cy="50" r="46" fill="none" stroke="#2166ff" strokeWidth="4" pathLength="100" strokeDasharray={`${progress * 100} 100`} transform="rotate(-90 50 50)" />
      <path d="M50 12v4 M12 50h4 M84 50h4 M50 84v4" stroke="#232934" strokeWidth="2" strokeLinecap="round" />
      <g visibility={now === null ? "hidden" : "visible"} stroke="#232934" strokeLinecap="round">
        <line x1="50" y1="35" x2="50" y2="23" strokeWidth="3" transform={`rotate(${hours * 30} 50 35)`} />
        <line x1="50" y1="35" x2="50" y2="18" strokeWidth="2" transform={`rotate(${minutes * 6} 50 35)`} />
        <circle cx="50" cy="35" r="2.5" fill="#232934" stroke="none" />
      </g>
      <text x="32" y="63" textAnchor="middle" className="update-clock-label">Since</text>
      <text x="68" y="63" textAnchor="middle" className="update-clock-label">Next</text>
      <text x="32" y="76" textAnchor="middle" className="update-clock-value" fill="#2166ff">{since}</text>
      <text x="68" y="76" textAnchor="middle" className="update-clock-value" fill="#232934">{next}</text>
    </svg>
  </div>;
}
