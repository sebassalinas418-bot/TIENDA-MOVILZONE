import type { SocialFrequency, SocialSchedule } from "@/lib/store-redes/types";

const ZONE = "America/Argentina/Buenos_Aires";

export function socialScheduleDue(schedule: SocialSchedule, now = new Date()) {
  if (!schedule.enabled) return false;
  const currentHour = arHour(now);
  if (currentHour !== clampHour(schedule.hour)) return false;
  if (!schedule.lastRunAt) return true;
  const last = new Date(schedule.lastRunAt).getTime();
  if (Number.isNaN(last)) return true;
  const elapsedHours = (now.getTime() - last) / 36e5;
  return elapsedHours >= minHours(schedule.frequency);
}

function minHours(frequency: SocialFrequency) {
  if (frequency === "weekly") return 24 * 6;
  if (frequency === "every_2_days") return 40;
  return 20;
}

function arHour(now: Date) {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONE,
    hour: "numeric",
    hourCycle: "h23",
  }).format(now);
  return Number.parseInt(hour, 10);
}

export function clampHour(hour: number) {
  if (!Number.isFinite(hour)) return 11;
  return Math.min(23, Math.max(0, Math.round(hour)));
}
