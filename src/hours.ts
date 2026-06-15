import { REP_HOURS, STORE_HOURS, AGENT_PADDING_HOURS, config } from "./config.js";

/** Day-of-week (0=Sun..6=Sat) and hour in America/Jamaica (no DST, UTC-5). */
export function localParts(now: Date = new Date()): { dow: number; hour: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: config.timezone, weekday: "short", hour: "numeric", hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const wd = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const hourRaw = parts.find((p) => p.type === "hour")?.value ?? "0";
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  let hour = Number(hourRaw);
  if (hour === 24) hour = 0;
  return { dow: map[wd] ?? 0, hour };
}

export function repsWorking(now: Date = new Date()): boolean {
  const { dow, hour } = localParts(now);
  const window = REP_HOURS[dow];
  if (!window) return false;
  return hour >= window[0] && hour < window[1];
}

export type CallbackPlan = {
  routingTag: "sales-immediate" | "sales-next-business-day";
  sourceTag: string;          // stored on the lead's `source`
  callbackPhrase: string;     // spoken to the caller
};

/** Decide callback timing + source tag based on when the call lands. */
export function callbackPlan(now: Date = new Date()): CallbackPlan {
  const { dow } = localParts(now);
  if (repsWorking(now)) {
    return {
      routingTag: "sales-immediate",
      sourceTag: "inbound-call-hours",
      callbackPhrase: "I'll have a sales rep reach out to you shortly today",
    };
  }
  const isWeekend = dow === 6 || dow === 0; // Sat or Sun
  return {
    routingTag: "sales-next-business-day",
    sourceTag: isWeekend ? "inbound-call-weekend" : "inbound-call-afterhours",
    callbackPhrase: isWeekend
      ? "Our reps are off for the weekend, so I'll have someone call you first thing Monday morning"
      : "Our reps have finished for the day, so I'll have someone call you first thing tomorrow morning",
  };
}


/** The agent answers from (store open − padding) to (store close + padding). */
export function agentWindow(dow: number): readonly [number, number] | null {
  const s = STORE_HOURS[dow];
  if (!s) return null;
  return [s[0] - AGENT_PADDING_HOURS, s[1] + AGENT_PADDING_HOURS];
}

/** Is the agent "working" right now (within its padded window)? */
export function agentActive(now: Date = new Date()): boolean {
  const { dow, hour } = localParts(now);
  const w = agentWindow(dow);
  if (!w) return false;
  return hour >= w[0] && hour < w[1];
}
