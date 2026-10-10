import type { OpeningDay, TimeRange } from "@/config/store-config";

export type FooterHourLine = {
  label: string;
  shifts: string[];
};

const weekdayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function rangesKey(ranges: TimeRange[]) {
  return ranges.map((range) => `${range.start}-${range.end}`).join("|");
}

function shiftsOf(ranges: TimeRange[]) {
  if (!ranges.length) return ["cerrado"];
  return ranges.map((range) => `${range.start} a ${range.end}`);
}

function rangesOf(openingHours: OpeningDay[], day: number): TimeRange[] {
  return openingHours.find((item) => item.day === day)?.ranges ?? [];
}

function weekdaySpanLabel(start: number, end: number) {
  if (start === end) return weekdayNames[start];
  return `${weekdayNames[start]} a ${weekdayNames[end]}`;
}

/**
 * Horarios del pie: agrupa Lunes a Viernes cuando el horario de semana es el mismo
 * (o casi: usa el horario más frecuente de lun–vie). No cambia el estado abierto/cerrado.
 */
export function formatFooterHours(openingHours: OpeningDay[]): FooterHourLine[] {
  const weekdayKeys = [1, 2, 3, 4, 5].map((day) => rangesKey(rangesOf(openingHours, day)));
  const counts = new Map<string, number>();
  for (const key of weekdayKeys) counts.set(key, (counts.get(key) ?? 0) + 1);
  let majorityKey = weekdayKeys[0] ?? "";
  let majorityCount = 0;
  for (const [key, count] of counts) {
    if (count > majorityCount) {
      majorityKey = key;
      majorityCount = count;
    }
  }

  const allWeekdaysMatch = weekdayKeys.every((key) => key === majorityKey);
  const lines: FooterHourLine[] = [];

  if (allWeekdaysMatch || majorityCount >= 4) {
    const sampleDay = [1, 2, 3, 4, 5].find((day) => rangesKey(rangesOf(openingHours, day)) === majorityKey) ?? 2;
    lines.push({ label: "Lunes a Viernes", shifts: shiftsOf(rangesOf(openingHours, sampleDay)) });
  } else {
    let start = 1;
    while (start <= 5) {
      const key = rangesKey(rangesOf(openingHours, start));
      let end = start;
      while (end < 5 && rangesKey(rangesOf(openingHours, end + 1)) === key) end += 1;
      lines.push({
        label: weekdaySpanLabel(start, end),
        shifts: shiftsOf(rangesOf(openingHours, start)),
      });
      start = end + 1;
    }
  }

  lines.push({ label: "Sábado", shifts: shiftsOf(rangesOf(openingHours, 6)) });
  lines.push({ label: "Domingo", shifts: shiftsOf(rangesOf(openingHours, 0)) });
  return lines;
}
