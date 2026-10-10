"use client";

import { useState } from "react";
import { formatPublicHours, useStoreConfig, type OpeningDay, type TimeRange } from "@/config/store-config";

const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const shiftNames = ["Mañana", "Tarde"] as const;

type ShiftDraft = { start: string; end: string };
type DayDraft = { day: OpeningDay["day"]; shifts: [ShiftDraft, ShiftDraft] };

function toDraft(days: OpeningDay[]): DayDraft[] {
  return [0, 1, 2, 3, 4, 5, 6].map((day) => {
    const ranges = days.find((item) => item.day === day)?.ranges ?? [];
    const morning = ranges.find((range) => range.start < "14:00");
    const afternoon = ranges.find((range) => range.start >= "14:00");
    return {
      day: day as OpeningDay["day"],
      shifts: [shiftOf(morning), shiftOf(afternoon)],
    };
  });
}

function shiftOf(range?: TimeRange): ShiftDraft {
  return { start: range?.start ?? "", end: range?.end ?? "" };
}

const defaultShifts: [ShiftDraft, ShiftDraft] = [
  { start: "09:00", end: "13:00" },
  { start: "16:30", end: "20:30" },
];

export function BusinessSettings() {
  const { config, updateConfig } = useStoreConfig();
  const [title, setTitle] = useState(config.location.title);
  const [detail, setDetail] = useState(config.location.detail);
  const [phone, setPhone] = useState(config.phone);
  const [whatsapp, setWhatsapp] = useState(config.whatsapp);
  const [instagram, setInstagram] = useState(config.instagram);
  const [days, setDays] = useState<DayDraft[]>(() => toDraft(config.openingHours));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function updateShift(day: OpeningDay["day"], index: 0 | 1, field: keyof ShiftDraft, value: string) {
    setDays((current) =>
      current.map((item) => {
        if (item.day !== day) return item;
        const shifts: [ShiftDraft, ShiftDraft] = [...item.shifts];
        shifts[index] = { ...shifts[index], [field]: value };
        return { ...item, shifts };
      }),
    );
    setSaved(false);
  }

  function setShift(day: OpeningDay["day"], index: 0 | 1, next: ShiftDraft) {
    setDays((current) =>
      current.map((item) => {
        if (item.day !== day) return item;
        const shifts: [ShiftDraft, ShiftDraft] = [...item.shifts];
        shifts[index] = next;
        return { ...item, shifts };
      }),
    );
    setSaved(false);
    setError("");
  }

  function save() {
    const address = title.trim();
    const city = detail.trim();
    const phoneText = phone.trim();
    const whatsappDigits = whatsapp.replace(/\D/g, "");
    const handle = instagram.trim().replace(/^@/, "");
    if (!address || !city || !phoneText || whatsappDigits.length < 8 || !handle) {
      setError("Completá dirección, teléfono, WhatsApp e Instagram.");
      setSaved(false);
      return;
    }

    for (const day of days) {
      for (const [index, shift] of day.shifts.entries()) {
        const hasStart = shift.start !== "";
        const hasEnd = shift.end !== "";
        const label = `${dayNames[day.day]}, turno de la ${shiftNames[index].toLowerCase()}`;
        if (hasStart !== hasEnd) {
          setError(`${label}: completalo o vacialo con la ×.`);
          setSaved(false);
          return;
        }
        if (hasStart && hasEnd && shift.start >= shift.end) {
          setError(`${label}: la hora de fin tiene que ser posterior a la de inicio.`);
          setSaved(false);
          return;
        }
      }
    }

    const openingHours: OpeningDay[] = days.map((day) => ({
      day: day.day,
      ranges: day.shifts.flatMap((shift) => {
        if (!shift.start || !shift.end) return [];
        return [{ start: shift.start, end: shift.end }];
      }),
    }));

    updateConfig({
      location: { title: address, detail: city },
      phone: phoneText,
      whatsapp: whatsappDigits,
      instagram: handle,
      openingHours,
      hours: formatPublicHours(openingHours),
    });
    setError("");
    setSaved(true);
  }

  return (
    <form
      className="space-y-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          <span className="font-medium text-gray-700">Dirección</span>
          <input
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setSaved(false);
            }}
            className="mt-1 h-10 w-full rounded-xl border border-gray-200 px-3 outline-none focus:border-sky-500"
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="font-medium text-gray-700">Localidad</span>
          <input
            value={detail}
            onChange={(event) => {
              setDetail(event.target.value);
              setSaved(false);
            }}
            className="mt-1 h-10 w-full rounded-xl border border-gray-200 px-3 outline-none focus:border-sky-500"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-gray-700">Teléfono</span>
          <input
            value={phone}
            onChange={(event) => {
              setPhone(event.target.value);
              setSaved(false);
            }}
            className="mt-1 h-10 w-full rounded-xl border border-gray-200 px-3 outline-none focus:border-sky-500"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-gray-700">WhatsApp</span>
          <input
            inputMode="numeric"
            value={whatsapp}
            onChange={(event) => {
              setWhatsapp(event.target.value.replace(/[^\d]/g, ""));
              setSaved(false);
            }}
            className="mt-1 h-10 w-full rounded-xl border border-gray-200 px-3 outline-none focus:border-sky-500"
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="font-medium text-gray-700">Instagram</span>
          <input
            value={instagram}
            onChange={(event) => {
              setInstagram(event.target.value);
              setSaved(false);
            }}
            className="mt-1 h-10 w-full rounded-xl border border-gray-200 px-3 outline-none focus:border-sky-500"
          />
        </label>
      </div>

      <fieldset className="rounded-2xl border border-gray-100 bg-[#f7f8fa] p-4">
        <legend className="px-1 text-xs font-semibold tracking-wide text-gray-500 uppercase">Horarios</legend>
        <p className="mb-3 text-xs text-gray-500">
          Mañana y tarde son independientes. Un turno vacío queda cerrado. Con Activar lo volvés a abrir y podés cambiar el horario.
        </p>
        <ul className="space-y-3">
          {days.map((day) => (
            <li key={day.day} className="grid gap-2 sm:grid-cols-[7.5rem_1fr] sm:items-center">
              <span className="text-sm font-semibold text-gray-900">{dayNames[day.day]}</span>
              <div className="flex flex-wrap gap-2">
                {day.shifts.map((shift, index) => {
                  const empty = shift.start === "" && shift.end === "";
                  const shiftIndex = index as 0 | 1;
                  return (
                    <span
                      key={shiftNames[shiftIndex]}
                      className={`flex items-center gap-1 rounded-xl border px-2 py-1 ${
                        empty ? "border-dashed border-gray-300 bg-gray-50" : "border-gray-200 bg-white"
                      }`}
                    >
                      <span className="w-14 text-[11px] font-bold tracking-wide text-sky-600 uppercase">
                        {shiftNames[shiftIndex]}
                      </span>
                      {empty ? (
                        <>
                          <span className="px-1 text-xs font-medium text-gray-400">Cerrado</span>
                          <button
                            type="button"
                            aria-label={`Activar ${shiftNames[shiftIndex]} de ${dayNames[day.day]}`}
                            onClick={() => setShift(day.day, shiftIndex, defaultShifts[shiftIndex])}
                            className="rounded-full bg-sky-500 px-2.5 py-1 text-xs font-bold text-white transition-colors hover:bg-sky-400"
                          >
                            Activar
                          </button>
                        </>
                      ) : (
                        <>
                          <input
                            type="time"
                            aria-label={`${dayNames[day.day]} ${shiftNames[shiftIndex]} desde`}
                            value={shift.start}
                            onChange={(event) => updateShift(day.day, shiftIndex, "start", event.target.value)}
                            className="h-8 bg-transparent text-sm text-gray-900 outline-none"
                          />
                          <span className="text-xs text-gray-400">a</span>
                          <input
                            type="time"
                            aria-label={`${dayNames[day.day]} ${shiftNames[shiftIndex]} hasta`}
                            value={shift.end}
                            onChange={(event) => updateShift(day.day, shiftIndex, "end", event.target.value)}
                            className="h-8 bg-transparent text-sm text-gray-900 outline-none"
                          />
                          <button
                            type="button"
                            aria-label={`Vaciar ${shiftNames[shiftIndex]} de ${dayNames[day.day]}`}
                            onClick={() => setShift(day.day, shiftIndex, { start: "", end: "" })}
                            className="flex h-7 w-7 items-center justify-center rounded-full text-base leading-none text-gray-400 hover:bg-sky-50 hover:text-sky-700"
                          >
                            ×
                          </button>
                        </>
                      )}
                    </span>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      </fieldset>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {saved ? <p className="text-sm font-medium text-sky-700">Configuración guardada. La tienda ya usa estos datos.</p> : null}

      <button
        type="submit"
        className="rounded-full bg-sky-500 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-sky-400"
      >
        Guardar configuración
      </button>
    </form>
  );
}
