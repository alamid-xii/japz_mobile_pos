import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Download,
  Printer,
  ShieldCheck,
} from "lucide-react";
import VisitPicker from "../components/VisitPicker";
import BookingSummary from "../components/BookingSummary";
import { useReservationSettings } from "../hooks/useReservationSettings";
import {
  downloadCalendar,
  errorMessage,
  reservationAPI,
  restaurantToday,
  type BookingData,
  type Reservation,
} from "../services/reservations";

export default function Reserve() {
  const { settings, error: settingsError, retry } = useReservationSettings();
  const [booking, setBooking] = useState<BookingData>({
    date: restaurantToday(),
    time: "",
    guests: 2,
    name: "",
    email: "",
    phone: "",
    occasion: "Just dining",
    notes: "",
  });
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [result, setResult] = useState<Reservation | null>(null);
  const [revision, setRevision] = useState(0);
  const requestKey = useRef("");
  const heading = useRef<HTMLHeadingElement>(null);
  function update(data: Partial<BookingData>) {
    setBooking((value) => ({ ...value, ...data }));
    setError("");
    requestKey.current = "";
  }
  function goTo(next: number) {
    setStep(next);
    setError("");
    setTimeout(() => heading.current?.focus(), 0);
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!booking.time) {
      setError("Choose an available time to continue.");
      return;
    }
    if (step < 2) {
      goTo(step + 1);
      return;
    }
    if (!agreed) {
      setError("Please agree to the reservation policy.");
      return;
    }
    setBusy(true);
    setError("");
    if (!requestKey.current) requestKey.current = crypto.randomUUID();
    try {
      const response = await reservationAPI.create(booking, requestKey.current);
      setResult(response.data.reservation);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setError(errorMessage(error));
      setRevision((value) => value + 1);
    } finally {
      setBusy(false);
    }
  }
  if (result)
    return (
      <section className="container page-section confirmation">
        <div className="confirmation-icon">
          <CheckCircle2 size={36} />
        </div>
        <span className="eyebrow">THANK YOU FOR CHOOSING JAPZ</span>
        <h1>Your request is in.</h1>
        <p>
          We’re looking forward to having you, {result.name.split(" ")[0]}.
          <br />
          Your reservation is awaiting confirmation from Japz.
        </p>
        <div className="reference-box">
          <span>SAVE YOUR BOOKING REFERENCE</span>
          <strong>{result.reference}</strong>
          <p>
            Keep this code and your booking email to check your status or make
            changes.
          </p>
        </div>
        <BookingSummary booking={result} />
        <div className="confirmation-actions">
          <Link
            className="button"
            to="/manage"
            state={{ reference: result.reference, email: result.email }}
          >
            View my reservation <ArrowRight size={17} />
          </Link>
          <button
            className="button button-outline"
            onClick={() => downloadCalendar(result)}
          >
            <Download size={16} /> Add to calendar
          </button>
          <button className="text-link" onClick={() => window.print()}>
            <Printer size={16} /> Print details
          </button>
        </div>
        <Link to="/" className="text-link">
          Back to Japz
        </Link>
      </section>
    );
  return (
    <section className="container page-section">
      <Link to="/" className="back-link">
        <ArrowLeft size={15} /> Back to Japz
      </Link>
      <div className="page-heading">
        <span className="eyebrow">A SEAT FOR YOUR NEXT GOOD MOMENT</span>
        <h1>Make a reservation.</h1>
        <p>Pick a time. Bring your people. We’ll take care of the good food.</p>
      </div>
      {settingsError ? (
        <div className="message error" role="alert">
          {settingsError}
          <button className="text-link" onClick={retry}>
            Try again
          </button>
        </div>
      ) : !settings ? (
        <div className="loading-state" role="status">
          Getting your table ready…
        </div>
      ) : (
        <div className="reservation-grid">
          <div>
            <ol className="booking-steps" aria-label="Booking progress">
              {["Your visit", "Your details", "Review"].map((label, index) => (
                <li
                  className={
                    step === index ? "current" : step > index ? "done" : ""
                  }
                  key={label}
                  aria-current={step === index ? "step" : undefined}
                >
                  <span>
                    {step > index ? <Check size={14} /> : `0${index + 1}`}
                  </span>
                  {label}
                </li>
              ))}
            </ol>
            <form className="panel booking-form" onSubmit={submit}>
              <h2 ref={heading} tabIndex={-1}>
                {
                  [
                    "When shall we see you?",
                    "Tell us a little about you.",
                    "Everything look good?",
                  ][step]
                }
              </h2>
              <p className="panel-intro">
                {
                  [
                    "Find a date and time that work for your group.",
                    "So we know who to welcome and how to reach you.",
                    "Review your visit before sending your reservation request.",
                  ][step]
                }
              </p>
              {step === 0 && (
                <VisitPicker
                  value={booking}
                  onChange={update}
                  settings={settings}
                  revision={revision}
                />
              )}
              {step === 1 && (
                <div className="details-fields">
                  <label>
                    Full name
                    <input
                      required
                      minLength={2}
                      maxLength={100}
                      autoComplete="name"
                      value={booking.name}
                      onChange={(event) => update({ name: event.target.value })}
                      placeholder="Your full name"
                    />
                  </label>
                  <div className="form-grid">
                    <label>
                      Email address
                      <input
                        required
                        type="email"
                        maxLength={254}
                        autoComplete="email"
                        value={booking.email}
                        onChange={(event) =>
                          update({ email: event.target.value })
                        }
                        placeholder="you@example.com"
                      />
                    </label>
                    <label>
                      Contact number
                      <input
                        required
                        type="tel"
                        minLength={7}
                        maxLength={25}
                        pattern="[+0-9 ()\-]{7,25}"
                        autoComplete="tel"
                        value={booking.phone}
                        onChange={(event) =>
                          update({ phone: event.target.value })
                        }
                        placeholder="09XX XXX XXXX"
                      />
                    </label>
                  </div>
                  <label>
                    What’s the occasion?
                    <select
                      value={booking.occasion}
                      onChange={(event) =>
                        update({ occasion: event.target.value })
                      }
                    >
                      {[
                        "Just dining",
                        "Birthday",
                        "Anniversary",
                        "Family gathering",
                        "Other",
                      ].map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Special requests{" "}
                    <span className="optional">(optional)</span>
                    <textarea
                      maxLength={1000}
                      rows={3}
                      value={booking.notes}
                      onChange={(event) =>
                        update({ notes: event.target.value })
                      }
                      placeholder="Dietary needs, accessibility, or anything else we should know"
                    />
                  </label>
                  <p className="field-hint">
                    We’ll do our best to accommodate special requests. They are
                    subject to availability.
                  </p>
                </div>
              )}
              {step === 2 && (
                <div className="review-details">
                  <dl>
                    <div>
                      <dt>Reserved for</dt>
                      <dd>{booking.name}</dd>
                    </div>
                    <div>
                      <dt>Email</dt>
                      <dd>{booking.email}</dd>
                    </div>
                    <div>
                      <dt>Contact</dt>
                      <dd>{booking.phone}</dd>
                    </div>
                    <div>
                      <dt>Occasion</dt>
                      <dd>{booking.occasion}</dd>
                    </div>
                    {booking.notes && (
                      <div>
                        <dt>Requests</dt>
                        <dd>{booking.notes}</dd>
                      </div>
                    )}
                  </dl>
                  <div className="policy">
                    <ShieldCheck size={21} />
                    <div>
                      <strong>A few things before you book</strong>
                      <p>
                        Your request needs confirmation from Japz. Your visit is
                        for {settings.durationMinutes} minutes. Changes and
                        cancellations are available online until{" "}
                        {settings.leadTimeMinutes} minutes before your visit.
                      </p>
                    </div>
                  </div>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(event) => setAgreed(event.target.checked)}
                      required
                    />
                    I’ve reviewed my details and agree to the reservation
                    policy.
                  </label>
                </div>
              )}
              {error && (
                <div className="message error" role="alert">
                  {error}
                  {step === 2 && (
                    <button
                      type="button"
                      className="text-link"
                      onClick={() => goTo(0)}
                    >
                      Check available times
                    </button>
                  )}
                </div>
              )}
              <div className="form-actions">
                {step > 0 && (
                  <button
                    type="button"
                    className="text-link"
                    disabled={busy}
                    onClick={() => goTo(step - 1)}
                  >
                    <ArrowLeft size={16} /> Back
                  </button>
                )}
                <button
                  className="button"
                  type="submit"
                  disabled={busy || !booking.time}
                >
                  {busy
                    ? "Sending request…"
                    : step === 2
                      ? "Request reservation"
                      : "Continue"}
                  <ArrowRight size={17} />
                </button>
              </div>
              <p className="privacy-note">
                Your details are used only to manage your Japz reservation.
              </p>
            </form>
          </div>
          <BookingSummary booking={booking} />
        </div>
      )}
    </section>
  );
}
