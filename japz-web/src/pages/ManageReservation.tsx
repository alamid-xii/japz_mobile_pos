import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Download,
  Search,
  X,
} from "lucide-react";
import BookingSummary from "../components/BookingSummary";
import VisitPicker from "../components/VisitPicker";
import { useReservationSettings } from "../hooks/useReservationSettings";
import {
  downloadCalendar,
  errorMessage,
  reservationAPI,
  type Reservation,
} from "../services/reservations";

export default function ManageReservation() {
  const location = useLocation();
  const initial = location.state as {
    reference?: string;
    email?: string;
  } | null;
  const [reference, setReference] = useState(initial?.reference || "");
  const [email, setEmail] = useState(initial?.email || "");
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [draft, setDraft] = useState<Reservation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [revision, refreshAvailability] = useState(0);
  const { settings, error: settingsError, retry } = useReservationSettings();
  useEffect(() => {
    if (!initial?.reference || !initial.email) return;
    let active = true;
    reservationAPI
      .lookup(initial.reference, initial.email)
      .then((response) => {
        if (active) setReservation(response.data.reservation);
      })
      .catch((error) => {
        if (active) setError(errorMessage(error));
      });
    return () => {
      active = false;
    };
    // Only use navigation state on entry; the lookup form owns subsequent searches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function lookup(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    setDraft(null);
    setReservation(null);
    setConfirmCancel(false);
    try {
      setReservation(
        (await reservationAPI.lookup(reference, email)).data.reservation,
      );
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function cancel() {
    if (!reservation) return;
    setBusy(true);
    setError("");
    try {
      setReservation(
        (await reservationAPI.cancel(reservation.reference, reservation.email))
          .data.reservation,
      );
      setConfirmCancel(false);
      setNotice(
        "Your reservation has been cancelled. We hope to see you another time.",
      );
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function reschedule(event: React.FormEvent) {
    event.preventDefault();
    if (!reservation || !draft) return;
    setBusy(true);
    setError("");
    try {
      setReservation(
        (
          await reservationAPI.reschedule(
            reservation.reference,
            reservation.email,
            draft,
          )
        ).data.reservation,
      );
      setDraft(null);
      setNotice(
        "Your changes have been saved and are awaiting confirmation from Japz.",
      );
    } catch (error) {
      setError(errorMessage(error));
      refreshAvailability((value) => value + 1);
    } finally {
      setBusy(false);
    }
  }
  const canChange =
    reservation &&
    settings &&
    ["pending", "confirmed"].includes(reservation.status) &&
    new Date(`${reservation.date}T${reservation.time}:00+08:00`).getTime() >=
      Date.now() + settings.leadTimeMinutes * 60000;
  return (
    <section className="container page-section">
      <Link to="/" className="back-link">
        <ArrowLeft size={15} /> Back to Japz
      </Link>
      <div className="page-heading">
        <span className="eyebrow">YOUR PLANS, ALL IN ONE PLACE</span>
        <h1>My reservation.</h1>
        <p>Check your status, adjust your visit, or cancel your booking.</p>
      </div>
      <div className="manage-grid">
        <div>
          <form className="panel lookup-form" onSubmit={lookup}>
            <h2>Find your reservation</h2>
            <p className="panel-intro">
              Use the reference code you received after booking.
            </p>
            <label>
              Booking reference
              <input
                required
                value={reference}
                onChange={(event) =>
                  setReference(event.target.value.toUpperCase())
                }
                maxLength={24}
                placeholder="JPZ-…"
                autoCapitalize="characters"
                spellCheck={false}
              />
            </label>
            <label>
              Booking email
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="The email used for your reservation"
                maxLength={254}
              />
            </label>
            <button type="submit" className="button" disabled={busy}>
              <Search size={17} />
              {busy ? "Please wait…" : "Find reservation"}
            </button>
          </form>
          <div className="help-note">
            <CalendarDays size={21} />
            <div>
              <strong>Plans change. We understand.</strong>
              <p>
                Use your reference and email to manage your visit. Keep your
                reference private.
              </p>
            </div>
          </div>
        </div>
        <div aria-live="polite">
          {error && (
            <div className="message error" role="alert">
              {error}
            </div>
          )}
          {notice && (
            <div className="message success" role="status">
              {notice}
            </div>
          )}
          {reservation ? (
            <>
              <BookingSummary booking={reservation} />
              <div className="panel reservation-detail">
                <div className="detail-heading">
                  <h2>{reservation.name}</h2>
                  <span className="reference-inline">
                    {reservation.reference}
                  </span>
                </div>
                <p>{reservation.occasion}</p>
                {reservation.notes && (
                  <p className="guest-notes">{reservation.notes}</p>
                )}
                {reservation.status === "pending" && (
                  <p className="field-hint">
                    Japz is reviewing your request. Check this page for
                    confirmation before visiting.
                  </p>
                )}
                {!["cancelled", "no_show"].includes(reservation.status) && (
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => downloadCalendar(reservation)}
                  >
                    <Download size={16} /> Add to calendar
                  </button>
                )}
                {settingsError && (
                  <div className="message error">
                    {settingsError}
                    <button className="text-link" onClick={retry}>
                      Retry
                    </button>
                  </div>
                )}
                {canChange && !draft && !confirmCancel && (
                  <div className="manage-actions">
                    <button
                      className="button button-outline"
                      onClick={() => {
                        setDraft({ ...reservation });
                        setNotice("");
                        setError("");
                      }}
                    >
                      Change reservation <ArrowRight size={16} />
                    </button>
                    <button
                      className="text-link danger"
                      onClick={() => setConfirmCancel(true)}
                    >
                      Cancel reservation
                    </button>
                  </div>
                )}
                {!canChange &&
                  ["pending", "confirmed"].includes(reservation.status) &&
                  settings && (
                    <p className="field-hint">
                      Online changes close {settings.leadTimeMinutes} minutes
                      before your visit. Please contact Japz for further
                      assistance.
                    </p>
                  )}
                {confirmCancel && (
                  <div
                    className="cancel-confirm"
                    role="group"
                    aria-label="Confirm cancellation"
                  >
                    <h3>Cancel this reservation?</h3>
                    <p>
                      Your seats will be released. You can make a new booking if
                      your plans change again.
                    </p>
                    <div className="form-actions">
                      <button
                        className="button button-outline"
                        disabled={busy}
                        onClick={() => setConfirmCancel(false)}
                      >
                        Keep my reservation
                      </button>
                      <button
                        className="button button-danger"
                        disabled={busy}
                        onClick={cancel}
                      >
                        {busy ? "Cancelling…" : "Yes, cancel reservation"}
                      </button>
                    </div>
                  </div>
                )}
                {draft && settings && (
                  <form className="reschedule-form" onSubmit={reschedule}>
                    <div className="detail-heading">
                      <h3>Update your visit</h3>
                      <button
                        className="icon-button"
                        type="button"
                        aria-label="Close rescheduling"
                        disabled={busy}
                        onClick={() => setDraft(null)}
                      >
                        <X size={19} />
                      </button>
                    </div>
                    <VisitPicker
                      value={draft}
                      onChange={(data) =>
                        setDraft((value) =>
                          value ? { ...value, ...data } : value,
                        )
                      }
                      settings={settings}
                      existing={reservation}
                  revision={revision}
                    />
                    <label>
                      Special requests
                      <textarea
                        rows={3}
                        maxLength={1000}
                        value={draft.notes}
                        onChange={(event) =>
                          setDraft((value) =>
                            value
                              ? { ...value, notes: event.target.value }
                              : value,
                          )
                        }
                      />
                    </label>
                    <p className="field-hint">
                      Changes need a new confirmation from Japz.
                    </p>
                    <button className="button" disabled={busy || !draft.time}>
                      {busy ? "Saving…" : "Save changes"}
                      <ArrowRight size={17} />
                    </button>
                  </form>
                )}
              </div>
            </>
          ) : (
            <div className="empty-reservation">
              <UtensilMark />
              <h2>Your next good moment.</h2>
              <p>Enter your booking details to see your reservation here.</p>
              <Link to="/reserve" className="text-link">
                Need a table? Make a reservation <ArrowRight size={16} />
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
function UtensilMark() {
  return (
    <div className="empty-icon">
      <CalendarDays size={30} />
    </div>
  );
}
