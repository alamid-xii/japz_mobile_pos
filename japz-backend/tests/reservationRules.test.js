import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_SETTINGS,
  localDate,
  validateBooking,
  availableSlots,
  seatsRemaining,
  validateSettings,
} from "../services/reservationRules.js";

const now = new Date("2026-10-26T00:00:00Z"); // 08:00 in the Philippines.
const booking = {
  name: "Guest Example",
  email: " GUEST@example.com ",
  phone: "09123456789",
  date: "2026-10-27",
  time: "12:00",
  guests: 4,
};
test("normalizes contact details and accepts an in-hours booking", () => {
  const value = validateBooking(booking, DEFAULT_SETTINGS, now);
  assert.equal(value.email, "guest@example.com");
  assert.equal(value.guests, 4);
});
test("restaurant date follows Philippine time across the UTC date boundary", () => {
  assert.equal(localDate(new Date("2026-10-26T17:00:00Z")), "2026-10-27");
});
test("rejects impossible calendar dates and dates outside the booking window", () => {
  for (const date of ["2026-02-30", "2026-10-25", "2027-10-26", "", null])
    assert.throws(() =>
      validateBooking({ ...booking, date }, DEFAULT_SETTINGS, now),
    );
});
test("rejects closing-time overruns and off-grid arrival times", () => {
  for (const time of ["22:00", "20:45", "08:30", "25:00", "12:10"])
    assert.throws(() =>
      validateBooking({ ...booking, time }, DEFAULT_SETTINGS, now),
    );
  assert.doesNotThrow(() =>
    validateBooking({ ...booking, time: "20:30" }, DEFAULT_SETTINGS, now),
  );
});
test("enforces booking lead time including same-day requests", () => {
  const early = new Date("2026-10-26T01:01:00Z");
  assert.throws(() =>
    validateBooking(
      { ...booking, date: "2026-10-26", time: "10:00" },
      DEFAULT_SETTINGS,
      early,
    ),
  );
});
test("rejects fractional, zero, oversized and malformed party sizes", () => {
  for (const guests of [0, -1, 1.5, 13, NaN, "2x", null, {}])
    assert.throws(() =>
      validateBooking({ ...booking, guests }, DEFAULT_SETTINGS, now),
    );
});
test("rejects invalid guest contact data and oversized requests", () => {
  for (const patch of [
    { name: " " },
    { email: "missing-at" },
    { phone: "abc12345" },
    { notes: "x".repeat(1001) },
    { occasion: "Invalid" },
  ])
    assert.throws(() =>
      validateBooking({ ...booking, ...patch }, DEFAULT_SETTINGS, now),
    );
});
const visit = (time, guests, durationMinutes = 90, status = "confirmed") => ({
  time,
  guests,
  durationMinutes,
  status,
});
test("overlapping pending and confirmed visits reserve seats", () => {
  assert.equal(
    seatsRemaining(
      [visit("12:00", 8), visit("12:30", 10, 90, "pending")],
      780,
      90,
      24,
    ),
    6,
  );
});
test("departures release seats exactly when the next visit starts", () => {
  assert.equal(seatsRemaining([visit("12:00", 24)], 810, 90, 24), 24);
});
test("uses peak overlap rather than summing non-overlapping visits", () => {
  assert.equal(
    seatsRemaining(
      [visit("12:00", 8, 30), visit("12:30", 10, 30)],
      720,
      90,
      24,
    ),
    14,
  );
});
test("cancelled, completed and no-show visits do not block future availability", () => {
  assert.equal(
    seatsRemaining(
      ["cancelled", "completed", "no_show"].map((status) =>
        visit("12:00", 24, 90, status),
      ),
      720,
      90,
      24,
    ),
    24,
  );
});
test("seated guests still reserve seats", () => {
  assert.equal(
    seatsRemaining([visit("12:00", 24, 90, "seated")], 750, 90, 24),
    0,
  );
});
test("availability disables full and past slots without exposing guest information", () => {
  const slots = availableSlots(
    "2026-10-26",
    4,
    [visit("12:00", 24)],
    DEFAULT_SETTINGS,
    new Date("2026-10-26T02:00:00Z"),
  );
  assert.equal(slots.find((slot) => slot.time === "09:00").available, false);
  assert.equal(slots.find((slot) => slot.time === "12:00").available, false);
  assert.equal(slots.find((slot) => slot.time === "13:30").available, true);
  assert.equal(slots.at(-1).time, "20:30");
});
test("settings reject impossible hours, unsafe capacities and invalid intervals", () => {
  for (const patch of [
    { capacity: 0 },
    { maxPartySize: 25 },
    { openTime: "23:00" },
    { slotIntervalMinutes: 0 },
    { advanceDays: 0 },
  ])
    assert.throws(() => validateSettings({ ...DEFAULT_SETTINGS, ...patch }));
  assert.equal(validateSettings(DEFAULT_SETTINGS).capacity, 24);
});
