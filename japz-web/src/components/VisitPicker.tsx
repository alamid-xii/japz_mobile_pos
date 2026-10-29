import { useEffect, useState } from "react";
import { CalendarDays, Clock3, Users } from "lucide-react";
import {
  displayTime,
  errorMessage,
  maxDate,
  reservationAPI,
  restaurantToday,
  type BookingData,
  type Reservation,
  type ReservationSettings,
  type Slot,
} from "../services/reservations";

interface Props {
  value: Pick<BookingData, "date" | "time" | "guests">;
  onChange: (data: Partial<BookingData>) => void;
  settings: ReservationSettings;
  revision?: number;
  existing?: Reservation;
}
export default function VisitPicker({
  value,
  onChange,
  settings,
  revision = 0,
  existing,
}: Props) {
  const [result, setResult] = useState<{ key: string; slots: Slot[] } | null>(
    null,
  );
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const key = `${value.date}/${value.guests}/${revision}/${retry}`;
  const loading = result?.key !== key && !error;
  useEffect(() => {
    const controller = new AbortController();
    reservationAPI
      .availability(value.date, value.guests, controller.signal, existing)
      .then((response) => {
        setResult({ key, slots: response.data.slots });
        setError("");
        if (
          value.time &&
          !response.data.slots.some(
            (slot) => slot.time === value.time && slot.available,
          )
        )
          onChange({ time: "" });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(errorMessage(error));
      });
    return () => controller.abort();
    // The date/party/retry key owns this request; selecting a time does not reload availability.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return (
    <div className="visit-picker">
      <div className="form-grid">
        <label>
          <span>
            <CalendarDays size={16} /> Date
          </span>
          <input
            type="date"
            required
            min={restaurantToday()}
            max={maxDate(settings.advanceDays)}
            value={value.date}
            onChange={(event) => {
              setError("");
              onChange({ date: event.target.value, time: "" });
            }}
          />
        </label>
        <label>
          <span>
            <Users size={16} /> Party size
          </span>
          <select
            value={value.guests}
            onChange={(event) => {
              setError("");
              onChange({ guests: Number(event.target.value), time: "" });
            }}
          >
            {Array.from({ length: settings.maxPartySize }, (_, index) => (
              <option value={index + 1} key={index}>
                {index + 1} {index === 0 ? "guest" : "guests"}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="slot-heading">
        <span>
          <Clock3 size={16} /> Available times
        </span>
        <small>Philippine time · UTC+8</small>
      </div>
      {error ? (
        <div className="message error" role="alert">
          {error}
          <button
            type="button"
            className="text-link"
            onClick={() => {
              setError("");
              setRetry((value) => value + 1);
            }}
          >
            Try again
          </button>
        </div>
      ) : loading ? (
        <p className="muted" role="status">
          Checking available tables…
        </p>
      ) : (
        <>
          <div
            className="time-slots"
            role="group"
            aria-label="Available reservation times"
          >
            {result?.slots.map((slot) => (
              <button
                key={slot.time}
                type="button"
                aria-pressed={value.time === slot.time}
                disabled={!slot.available}
                className={`time-slot ${value.time === slot.time ? "selected" : ""}`}
                onClick={() => onChange({ time: slot.time })}
                title={slot.reason || "Available"}
              >
                {displayTime(slot.time)}
                {!slot.available && <small>{slot.reason}</small>}
              </button>
            ))}
          </div>
          {!result?.slots.some((slot) => slot.available) && (
            <p className="message">
              No tables are available for this date and party size. Try another
              day or a smaller party.
            </p>
          )}
        </>
      )}
      <p className="field-hint">
        Each reservation is for {settings.durationMinutes} minutes. Book up to{" "}
        {settings.advanceDays} days ahead, at least {settings.leadTimeMinutes}{" "}
        minutes before your visit.
      </p>
    </div>
  );
}
