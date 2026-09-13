export function nextScheduledUpdate(now: number, timeZone: string, hours: number[]) {
  const formatter = new Intl.DateTimeFormat("en-US", {timeZone, hour: "numeric", hourCycle: "h23"});
  // Scan real hours so Chicago daylight-saving transitions are handled correctly.
  for (let candidate = Math.floor(now / 3600000) * 3600000 + 3600000; candidate <= now + 30 * 3600000; candidate += 3600000) {
    if (hours.includes(Number(formatter.format(candidate)))) return candidate;
  }
  return null;
}

export function duration(ms: number) {
  const minutes = Math.max(0, Math.floor(ms / 60000));
  return `${Math.floor(minutes / 60)}:${(minutes % 60).toString().padStart(2, "0")}`;
}
