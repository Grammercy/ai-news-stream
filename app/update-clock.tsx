"use client";
import { useEffect, useState } from "react";

import schedule from "./update-status.json";
import { duration, nextScheduledUpdate } from "./update-timing";

export default function UpdateClock({ checkedAt }: { checkedAt: number | null }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const timer = setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", tick); };
  }, []);
  const elapsed = now !== null && checkedAt != null ? Math.max(0, now - checkedAt) : null;
  const nextCheckAt = now === null ? null : nextScheduledUpdate(now, schedule.timeZone, schedule.hours);
  const remaining = now !== null && nextCheckAt !== null ? Math.max(0, nextCheckAt - now) : null;
  const progress = elapsed === null ? 0 : Math.min(1, elapsed / Math.max(1, elapsed + (remaining ?? 0)));
  const date = new Date(now ?? 0);
  const minutes = now === null ? 0 : date.getMinutes() + date.getSeconds() / 60;
  const hours = now === null ? 0 : date.getHours() % 12 + minutes / 60;
  const since = elapsed === null ? "--:--" : duration(elapsed);
  const next = remaining === null ? "--:--" : duration(remaining);
  const description = `Since coverage cutoff: ${since}. Next scheduled automation in ${next}. Times are hours:minutes. Schedule: midnight, 6 AM, noon, and 6 PM America/Chicago. Blue shows the elapsed coverage gap.`;
  return <div className="update-clock" role="img" aria-label={description} title={description}>
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="46" fill="white" stroke="#232934" strokeWidth="4" />
      <circle cx="50" cy="50" r="46" fill="none" stroke="#2166ff" strokeWidth="4" pathLength="100" strokeDasharray={`${progress * 100} 100`} transform="rotate(-90 50 50)" />
      <path d="M50 12v4 M12 50h4 M84 50h4 M50 84v4" stroke="#232934" strokeWidth="2" strokeLinecap="round" />
      <g visibility={now === null ? "hidden" : "visible"} stroke="#232934" strokeLinecap="round">
        <line x1="50" y1="50" x2="50" y2="27" strokeWidth="3" transform={`rotate(${hours * 30} 50 50)`} />
        <line x1="50" y1="50" x2="50" y2="19" strokeWidth="2" transform={`rotate(${minutes * 6} 50 50)`} />
        <circle cx="50" cy="50" r="2.5" fill="#232934" stroke="none" />
      </g>
      <text x="32" y="63" textAnchor="middle" className="update-clock-label">Since</text>
      <text x="68" y="63" textAnchor="middle" className="update-clock-label">Next</text>
      <text x="32" y="76" textAnchor="middle" className="update-clock-value" fill="#2166ff">{since}</text>
      <text x="68" y="76" textAnchor="middle" className="update-clock-value" fill="#232934">{next}</text>
    </svg>
  </div>;
}
