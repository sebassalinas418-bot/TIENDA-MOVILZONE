import { matchingScheduleHour, scheduleHours } from "@/lib/store-redes/schedule";
import type { FreeCampaignSlot, SocialSchedule } from "@/lib/store-redes/types";

export const FREE_CAMPAIGN_DAYS = [
  { id: 1, label: "Lun" },
  { id: 2, label: "Mar" },
  { id: 3, label: "Mié" },
  { id: 4, label: "Jue" },
  { id: 5, label: "Vie" },
  { id: 6, label: "Sáb" },
  { id: 7, label: "Dom" },
] as const;

const AR_ZONE = "America/Argentina/Buenos_Aires";
const WEEKDAY_ISO: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

export function normalizeFreeCampaignDays(days?: number[] | null) {
  const unique: number[] = [];
  for (const day of days ?? []) {
    const id = Number(day);
    if (!Number.isInteger(id) || id < 1 || id > 7 || unique.includes(id)) continue;
    unique.push(id);
  }
  return unique.sort((a, b) => a - b);
}

export function toggleFreeCampaignDay(days: number[] | undefined, day: number) {
  const current = normalizeFreeCampaignDays(days);
  return current.includes(day)
    ? current.filter((item) => item !== day)
    : normalizeFreeCampaignDays([...current, day]);
}

export function arIsoWeekday(now = new Date()) {
  const label = new Intl.DateTimeFormat("en-US", {
    timeZone: AR_ZONE,
    weekday: "short",
  }).format(now);
  return WEEKDAY_ISO[label] ?? 0;
}

export function isFreeCampaignDay(schedule: Pick<SocialSchedule, "freeCampaignDays">, now = new Date()) {
  const days = normalizeFreeCampaignDays(schedule.freeCampaignDays);
  if (!days.length) return false;
  return days.includes(arIsoWeekday(now));
}

export function maskHourInput(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

export function isValidHourInput(value: string) {
  const match = value.trim().match(/^(\d{2}):(\d{2})$/);
  if (!match) return false;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour <= 23 && minute <= 59;
}

export function formatQueueUploadAt(
  iso: string | null | undefined,
  fallbackHour?: string,
  days?: number[] | null,
) {
  if (iso) {
    const date = new Date(iso);
    if (Number.isFinite(date.getTime())) {
      const day = new Intl.DateTimeFormat("es-AR", {
        timeZone: AR_ZONE,
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
      }).format(date);
      const time = new Intl.DateTimeFormat("es-AR", {
        timeZone: AR_ZONE,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).format(date);
      return `Subida ${day} · ${time}`;
    }
  }
  if (fallbackHour) {
    const labels = normalizeFreeCampaignDays(days)
      .map((id) => FREE_CAMPAIGN_DAYS.find((day) => day.id === id)?.label)
      .filter(Boolean)
      .join(" ");
    return labels ? `Subida ${labels} · ${fallbackHour}` : `Subida ${fallbackHour}`;
  }
  return "";
}

/** Si la cola de fotos libres está activa y toca horario+día, devuelve el slot. */
export function freeCampaignDueSlot(schedule: SocialSchedule, now = new Date()) {
  if (!schedule.freeQueueActive) return null;
  if (!isFreeCampaignDay(schedule, now)) return null;
  return matchingScheduleHour(schedule, now);
}

/** Alinea 1 horario = 1 foto. Sin duplicar imageId entre slots. */
export function syncFreeCampaignSlots(
  hours: string[],
  slots?: FreeCampaignSlot[] | null,
): FreeCampaignSlot[] {
  const prev = Array.isArray(slots) ? slots : [];
  const used = new Set<string>();
  return hours.map((hour) => {
    const match =
      prev.find((slot) => slot.hour === hour && slot.imageId && !used.has(slot.imageId)) ??
      prev.find((slot) => !slot.hour && slot.imageId && !used.has(slot.imageId));
    if (match?.imageId) {
      used.add(match.imageId);
      return { ...match, hour };
    }
    return emptyCampaignSlot(hour);
  });
}

export function emptyCampaignSlot(hour: string): FreeCampaignSlot {
  return { hour, imageId: "" };
}

export function assignCampaignImage(
  slots: FreeCampaignSlot[],
  index: number,
  imageId: string,
  extra?: Partial<FreeCampaignSlot>,
): FreeCampaignSlot[] {
  const id = imageId.trim();
  return slots.map((slot, slotIndex) => {
    if (slotIndex === index) {
      if (!id) return { hour: slot.hour, imageId: "" };
      return { ...slot, ...extra, hour: slot.hour, imageId: id };
    }
    if (id && slot.imageId === id) return emptyCampaignSlot(slot.hour);
    return slot;
  });
}

export function campaignSlotsForSchedule(schedule: Pick<SocialSchedule, "hour" | "hours" | "freeCampaignSlots">) {
  return syncFreeCampaignSlots(scheduleHours(schedule), schedule.freeCampaignSlots);
}

export function campaignPayload(slots: FreeCampaignSlot[]) {
  return slots
    .filter((slot) => slot.imageId)
    .map((slot) => ({
      horario: slot.hour,
      imagen: slot.imageUrl || slot.imageId,
      texto: slot.caption || "",
      postId: slot.postId || undefined,
    }));
}
