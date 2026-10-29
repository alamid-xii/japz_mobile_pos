export const DEFAULT_SETTINGS = {
  id: 1,
  openTime: "09:00",
  closeTime: "22:00",
  capacity: 24,
  maxPartySize: 12,
  durationMinutes: 90,
  slotIntervalMinutes: 30,
  leadTimeMinutes: 60,
  advanceDays: 60,
  timeZone: "Asia/Manila",
};

export class ReservationError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export function localDate(
  now = new Date(),
  timeZone = DEFAULT_SETTINGS.timeZone,
) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  return ["year", "month", "day"]
    .map((type) => parts.find((part) => part.type === type).value)
    .join("-");
}

export function timeMinutes(time) {
  const match = /^(\d{2}):(\d{2})(?::00)?$/.exec(String(time));
  if (!match || +match[1] > 23 || +match[2] > 59)
    throw new ReservationError("Enter a valid time.");
  return +match[1] * 60 + +match[2];
}

export function timeLabel(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

// The restaurant uses Philippine time (UTC+08:00), without daylight saving time.
export function bookingStart(date, time) {
  return new Date(`${date}T${time.slice(0, 5)}:00+08:00`);
}

export function validateDate(date, settings, now = new Date()) {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw new ReservationError("Choose a valid reservation date.");
  const parsed = new Date(`${date}T00:00:00Z`);
  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  )
    throw new ReservationError("Choose a valid reservation date.");
  const today = localDate(now, settings.timeZone);
  const lastDate = new Date(`${today}T00:00:00Z`);
  lastDate.setUTCDate(lastDate.getUTCDate() + settings.advanceDays);
  if (date < today || date > lastDate.toISOString().slice(0, 10))
    throw new ReservationError(
      `Choose a date within the next ${settings.advanceDays} days.`,
    );
}

export function validatePartySize(value, settings) {
  const guests =
    typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  if (!Number.isInteger(guests) || guests < 1 || guests > settings.maxPartySize)
    throw new ReservationError(
      `Reservations are available for 1–${settings.maxPartySize} guests.`,
    );
  return guests;
}

export function validateBooking(input, settings, now = new Date()) {
  validateDate(input.date, settings, now);
  const guests = validatePartySize(input.guests, settings);
  const minute = timeMinutes(input.time);
  const open = timeMinutes(settings.openTime);
  const close = timeMinutes(settings.closeTime);
  if (
    minute < open ||
    minute + settings.durationMinutes > close ||
    (minute - open) % settings.slotIntervalMinutes !== 0
  )
    throw new ReservationError("Choose an available reservation time.");
  if (
    bookingStart(input.date, input.time).getTime() <
    now.getTime() + settings.leadTimeMinutes * 60000
  )
    throw new ReservationError(
      `Book at least ${settings.leadTimeMinutes} minutes before your visit.`,
    );
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email =
    typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const phone = typeof input.phone === "string" ? input.phone.trim() : "";
  const notes = typeof input.notes === "string" ? input.notes.trim() : "";
  if (name.length < 2 || name.length > 100)
    throw new ReservationError("Enter your full name (2–100 characters).");
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new ReservationError("Enter a valid email address.");
  if (!/^[+\d\s()-]{7,25}$/.test(phone) || phone.replace(/\D/g, "").length < 7)
    throw new ReservationError("Enter a valid contact number.");
  if (notes.length > 1000)
    throw new ReservationError(
      "Special requests must be 1,000 characters or fewer.",
    );
  const occasion = input.occasion || "Just dining";
  if (
    ![
      "Just dining",
      "Birthday",
      "Anniversary",
      "Family gathering",
      "Other",
    ].includes(occasion)
  )
    throw new ReservationError("Choose a valid occasion.");
  return {
    name,
    email,
    phone,
    date: input.date,
    time: timeLabel(minute),
    guests,
    notes,
    occasion,
  };
}

export function seatsRemaining(bookings, start, duration, capacity) {
  const end = start + duration;
  const events = [];
  for (const booking of bookings) {
    if (!["pending", "confirmed", "seated"].includes(booking.status)) continue;
    const from = timeMinutes(booking.time);
    const until = from + booking.durationMinutes;
    if (from < end && until > start) {
      events.push(
        [Math.max(start, from), booking.guests],
        [Math.min(end, until), -booking.guests],
      );
    }
  }
  // Departures free seats before arrivals at the same minute.
  events.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let occupied = 0,
    peak = 0;
  for (const [, change] of events) {
    occupied += change;
    peak = Math.max(peak, occupied);
  }
  return Math.max(0, capacity - peak);
}

export function availableSlots(
  date,
  guests,
  bookings,
  settings,
  now = new Date(),
) {
  validateDate(date, settings, now);
  guests = validatePartySize(guests, settings);
  const slots = [];
  for (
    let minute = timeMinutes(settings.openTime);
    minute + settings.durationMinutes <= timeMinutes(settings.closeTime);
    minute += settings.slotIntervalMinutes
  ) {
    const time = timeLabel(minute);
    const remaining = seatsRemaining(
      bookings,
      minute,
      settings.durationMinutes,
      settings.capacity,
    );
    const inFuture =
      bookingStart(date, time).getTime() >=
      now.getTime() + settings.leadTimeMinutes * 60000;
    slots.push({
      time,
      available: inFuture && remaining >= guests,
      remaining,
      reason: !inFuture
        ? "Too soon"
        : remaining < guests
          ? "Fully booked"
          : null,
    });
  }
  return slots;
}

export function validateSettings(input) {
  const result = {};
  const ranges = {
    capacity: [1, 500],
    maxPartySize: [1, 100],
    durationMinutes: [30, 240],
    slotIntervalMinutes: [15, 60],
    leadTimeMinutes: [0, 1440],
    advanceDays: [1, 365],
  };
  for (const [key, [min, max]] of Object.entries(ranges)) {
    if (!Number.isInteger(input[key]) || input[key] < min || input[key] > max)
      throw new ReservationError(`${key} must be between ${min} and ${max}.`);
    result[key] = input[key];
  }
  result.openTime = timeLabel(timeMinutes(input.openTime));
  result.closeTime = timeLabel(timeMinutes(input.closeTime));
  if (
    timeMinutes(result.closeTime) - timeMinutes(result.openTime) <
    result.durationMinutes
  )
    throw new ReservationError(
      "Opening hours must allow a complete reservation.",
    );
  if (result.maxPartySize > result.capacity)
    throw new ReservationError(
      "Maximum party size cannot exceed seating capacity.",
    );
  return result;
}

export const STATUS_TRANSITIONS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["seated", "cancelled", "no_show"],
  seated: ["completed"],
  completed: [],
  cancelled: [],
  no_show: [],
};
