import type { SocialFrequency, SocialSchedule } from "@/lib/store-redes/types";

const ZONE = "America/Argentina/Buenos_Aires";
const MAX_SLOTS = 5;
const SLOT_WINDOW_MINUTES = 12;

export function socialScheduleDue(schedule: SocialSchedule, now = new Date()) {
  return Boolean(socialScheduleMatch(schedule, now));
}

export function socialScheduleMatch(schedule: SocialSchedule, now = new Date()) {
  if (!schedule.enabled) return null;
  const { hour, minute } = arClock(now);
  const nowMins = hour * 60 + minute;
  for (const slot of scheduleHours(schedule)) {
    const slotMins = parseClock(slot);
    if (slotMins == null) continue;
    if (nowMins < slotMins || nowMins >= slotMins + SLOT_WINDOW_MINUTES) continue;
    const last = schedule.lastRunBySlot?.[slot] || fallbackLastForHour(schedule, slot);
    if (!last) return slot;
    const elapsedHours = (now.getTime() - new Date(last).getTime()) / 36e5;
    if (!Number.isFinite(elapsedHours) || elapsedHours >= minHours(schedule.frequency)) return slot;
  }
  return null;
}

export function scheduleHours(schedule: Pick<SocialSchedule, "hour" | "hours">) {
  return normalizeScheduleHours(schedule.hours, schedule.hour);
}

export function normalizeScheduleHours(hours?: string[] | null, fallbackHour?: number) {
  const source = Array.isArray(hours) && hours.length ? hours : [`${pad(clampHour(fallbackHour ?? 11))}:00`];
  const unique: string[] = [];
  for (const raw of source) {
    const slot = normalizeClock(raw);
    if (!slot || unique.includes(slot)) continue;
    unique.push(slot);
    if (unique.length >= MAX_SLOTS) break;
  }
  return unique.length ? unique : ["11:00"];
}

export function clampHour(hour: number) {
  if (!Number.isFinite(hour)) return 11;
  return Math.min(23, Math.max(0, Math.round(hour)));
}

function fallbackLastForHour(schedule: SocialSchedule, slot: string) {
  const [h] = slot.split(":");
  if (Number(h) === clampHour(schedule.hour) && slot.endsWith(":00")) return schedule.lastRunAt;
  return null;
}

function minHours(frequency: SocialFrequency) {
  if (frequency === "weekly") return 24 * 6;
  if (frequency === "every_2_days") return 40;
  return 20;
}

function arClock(now: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return { hour, minute };
}

function normalizeClock(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return "";
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return "";
  return `${pad(hour)}:${pad(minute)}`;
}

function parseClock(value: string) {
  const slot = normalizeClock(value);
  if (!slot) return null;
  const [hour, minute] = slot.split(":").map(Number);
  return hour * 60 + minute;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}
