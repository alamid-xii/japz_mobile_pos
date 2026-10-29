import axios from "axios";
import api from "./api";

export interface ReservationSettings {
  openTime: string;
  closeTime: string;
  capacity: number;
  maxPartySize: number;
  durationMinutes: number;
  slotIntervalMinutes: number;
  leadTimeMinutes: number;
  advanceDays: number;
  timeZone: string;
}
export type ReservationStatus =
  "pending" | "confirmed" | "seated" | "completed" | "cancelled" | "no_show";
export interface BookingData {
  date: string;
  time: string;
  guests: number;
  name: string;
  email: string;
  phone: string;
  occasion: string;
  notes: string;
}
export interface Reservation extends BookingData {
  id: number;
  reference: string;
  status: ReservationStatus;
  durationMinutes: number;
  createdAt: string;
}
export interface Slot {
  time: string;
  available: boolean;
  remaining: number;
  reason: string | null;
}
export const reservationAPI = {
  settings: (signal?: AbortSignal) =>
    api.get<ReservationSettings>("/api/reservation-settings", { signal }),
  availability: (
    date: string,
    guests: number,
    signal?: AbortSignal,
    existing?: Reservation,
  ) =>
    existing
      ? api.post<{ slots: Slot[] }>(
          "/api/reservations/guest-availability",
          {
            date,
            guests,
            reference: existing.reference,
            email: existing.email,
          },
          { signal },
        )
      : api.get<{ slots: Slot[] }>("/api/reservations/availability", {
          params: { date, guests },
          signal,
        }),
  create: (data: BookingData, requestKey: string) =>
    api.post<{ reservation: Reservation }>("/api/reservations", {
      ...data,
      requestKey,
    }),
  lookup: (reference: string, email: string) =>
    api.post<{ reservation: Reservation }>("/api/reservations/lookup", {
      reference,
      email,
    }),
  cancel: (reference: string, email: string) =>
    api.post<{ reservation: Reservation }>(
      `/api/reservations/${encodeURIComponent(reference)}/cancel`,
      { email },
    ),
  reschedule: (
    reference: string,
    email: string,
    data: Pick<BookingData, "date" | "time" | "guests" | "notes">,
  ) =>
    api.patch<{ reservation: Reservation }>(
      `/api/reservations/${encodeURIComponent(reference)}`,
      { ...data, email },
    ),
  list: (date: string, signal?: AbortSignal) =>
    api.get<{ reservations: Reservation[] }>("/api/admin/reservations", {
      params: { date },
      signal,
    }),
  status: (id: number, status: ReservationStatus) =>
    api.patch<{ reservation: Reservation }>(
      `/api/admin/reservations/${id}/status`,
      { status },
    ),
  updateSettings: (data: ReservationSettings) =>
    api.put<ReservationSettings>("/api/admin/reservation-settings", data),
};
export function errorMessage(error: unknown) {
  if (axios.isAxiosError(error))
    return (
      error.response?.data?.error ||
      "We could not connect to Japz reservations. Please try again."
    );
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}
export function restaurantToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  return ["year", "month", "day"]
    .map((type) => parts.find((part) => part.type === type)?.value)
    .join("-");
}
export function maxDate(days: number) {
  const date = new Date(`${restaurantToday()}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function displayDate(date: string) {
  return new Date(`${date}T12:00:00+08:00`).toLocaleDateString("en-PH", {
    timeZone: "Asia/Manila",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
export function displayTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}
export const statusLabel: Record<ReservationStatus, string> = {
  pending: "Awaiting confirmation",
  confirmed: "Confirmed",
  seated: "Seated",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};
export function downloadCalendar(reservation: Reservation) {
  const start = new Date(`${reservation.date}T${reservation.time}:00+08:00`);
  const end = new Date(start.getTime() + reservation.durationMinutes * 60000);
  const stamp = (date: Date) =>
    date
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  const content = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Japz Grill//Reservations//EN",
    "BEGIN:VEVENT",
    `UID:${reservation.reference}@japz-reservations`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    "SUMMARY:Japz Grill reservation request",
    `DESCRIPTION:Reference ${reservation.reference}. Check your booking status before visiting.`,
    "STATUS:TENTATIVE",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
  const url = URL.createObjectURL(
    new Blob([content], { type: "text/calendar;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `${reservation.reference}.ics`;
  link.click();
  URL.revokeObjectURL(url);
}
