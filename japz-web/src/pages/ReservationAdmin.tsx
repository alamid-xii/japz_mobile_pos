import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  CalendarDays,
  Download,
  LogOut,
  RefreshCw,
  Search,
  Settings2,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useReservationSettings } from "../hooks/useReservationSettings";
import {
  displayTime,
  errorMessage,
  reservationAPI,
  restaurantToday,
  statusLabel,
  type Reservation,
  type ReservationSettings,
  type ReservationStatus,
} from "../services/reservations";

const transitions: Record<ReservationStatus, ReservationStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["seated", "cancelled", "no_show"],
  seated: ["completed"],
  completed: [],
  cancelled: [],
  no_show: [],
};
const actionLabels: Partial<Record<ReservationStatus, string>> = {
  confirmed: "Confirm booking",
  cancelled: "Cancel booking",
  seated: "Seat guests",
  completed: "Complete visit",
  no_show: "Mark no-show",
};
export default function ReservationAdmin() {
  const { user, isInitialized, logout } = useAuth();
  if (!isInitialized)
    return (
      <div className="loading-state" role="status">
        Loading your account…
      </div>
    );
  if (!user || user.role !== "admin") return <Navigate to="/login" replace />;
  return <AdminContent name={user.name} logout={logout} />;
}
function AdminContent({
  name,
  logout,
}: {
  name: string;
  logout: () => Promise<void>;
}) {
  const [date, setDate] = useState(restaurantToday());
  const [data, setData] = useState<{
    date: string;
    reservations: Reservation[];
  } | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [revision, refresh] = useState(0);
  const [busy, setBusy] = useState<number | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    reservation: Reservation;
    status: ReservationStatus;
  } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const {
    settings,
    setSettings,
    error: settingsError,
    retry,
  } = useReservationSettings();
  useEffect(() => {
    const timer = setInterval(() => refresh((value) => value + 1), 30000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    reservationAPI
      .list(date, controller.signal)
      .then((response) => {
        setData({ date, reservations: response.data.reservations });
        setError("");
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(errorMessage(error));
      });
    return () => controller.abort();
  }, [date, revision]);
  const reservations = data?.date === date ? data.reservations : [];
  const filtered = reservations.filter(
    (booking) =>
      (filter === "all" || booking.status === filter) &&
      `${booking.name} ${booking.reference} ${booking.email} ${booking.phone}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const active = reservations.filter((booking) =>
    ["pending", "confirmed", "seated"].includes(booking.status),
  );
  async function changeStatus(
    reservation: Reservation,
    status: ReservationStatus,
  ) {
    setBusy(reservation.id);
    setError("");
    setNotice("");
    try {
      const updated = (await reservationAPI.status(reservation.id, status)).data
        .reservation;
      setData((value) =>
        value
          ? {
              ...value,
              reservations: value.reservations.map((item) =>
                item.id === updated.id ? updated : item,
              ),
            }
          : value,
      );
      setPendingAction(null);
      setNotice(
        `${reservation.reference}: ${statusLabel[status].toLowerCase()}.`,
      );
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(null);
    }
  }
  function exportCsv() {
    const cell = (value: unknown) => {
      let text = String(value ?? "");
      if (/^[=+@\-\t\r]/.test(text)) text = `'${text}`;
      return `"${text.replace(/"/g, '""')}"`;
    };
    const rows = [
      [
        "Reference",
        "Date",
        "Time",
        "Guests",
        "Name",
        "Email",
        "Phone",
        "Status",
        "Occasion",
        "Requests",
      ],
      ...filtered.map((booking) => [
        booking.reference,
        booking.date,
        booking.time,
        booking.guests,
        booking.name,
        booking.email,
        booking.phone,
        statusLabel[booking.status],
        booking.occasion,
        booking.notes,
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob(
        ["\uFEFF" + rows.map((row) => row.map(cell).join(",")).join("\r\n")],
        { type: "text/csv;charset=utf-8" },
      ),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `japz-reservations-${date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <section className="container page-section admin-section">
      <div className="admin-heading">
        <div>
          <span className="eyebrow">JAPZ RESERVATION MANAGEMENT</span>
          <h1>The guest list.</h1>
          <p>Welcome, {name}. Here’s who’s joining us.</p>
        </div>
        <div className="admin-tools">
          <button
            className="button button-outline button-small"
            onClick={() => setShowSettings((value) => !value)}
          >
            <Settings2 size={16} /> Booking settings
          </button>
          <button
            className="icon-button"
            title="Sign out"
            aria-label="Sign out"
            onClick={() => void logout()}
          >
            <LogOut size={19} />
          </button>
        </div>
      </div>
      {settingsError && (
        <div className="message error">
          {settingsError}
          <button className="text-link" onClick={retry}>
            Retry
          </button>
        </div>
      )}
      {showSettings && settings && (
        <SettingsForm
          settings={settings}
          onSave={(value) => {
            setSettings(value);
            setNotice("Reservation settings saved.");
            setShowSettings(false);
          }}
          onClose={() => setShowSettings(false)}
        />
      )}
      <div className="admin-stats">
        {[
          {
            label: "Active reservations",
            value: active.length,
            icon: CalendarDays,
          },
          {
            label: "Expected guests",
            value: active.reduce((sum, booking) => sum + booking.guests, 0),
            icon: Users,
          },
          {
            label: "Awaiting confirmation",
            value: reservations.filter(
              (booking) => booking.status === "pending",
            ).length,
            icon: CalendarDays,
          },
          {
            label: "Completed visits",
            value: reservations.filter(
              (booking) => booking.status === "completed",
            ).length,
            icon: Users,
          },
        ].map(({ label, value, icon: Icon }) => (
          <div className="stat-card" key={label}>
            <span>
              {label}
              <Icon size={17} />
            </span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="panel admin-list">
        <div className="list-toolbar">
          <label className="date-filter">
            <span>Reservation date</span>
            <input
              aria-label="Reservation date"
              required
              type="date"
              value={date}
              onChange={(event) => {
                if (event.target.value) {
                  setDate(event.target.value);
                  setError("");
                  setPendingAction(null);
                }
              }}
            />
          </label>
          <label className="search-input">
            <Search size={17} />
            <input
              aria-label="Search reservations"
              placeholder="Search guests or reference"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <button
            className="icon-button"
            onClick={() => refresh((value) => value + 1)}
            aria-label="Refresh reservations"
            title="Refresh"
          >
            <RefreshCw size={18} />
          </button>
          <button
            className="button button-outline button-small"
            disabled={!filtered.length}
            onClick={exportCsv}
          >
            <Download size={16} /> Export CSV
          </button>
        </div>
        <div
          className="status-filters"
          role="group"
          aria-label="Filter by status"
        >
          {["all", ...Object.keys(statusLabel)].map((status) => (
            <button
              key={status}
              className={status === filter ? "active" : ""}
              aria-pressed={status === filter}
              onClick={() => setFilter(status)}
            >
              {status === "all"
                ? "All reservations"
                : statusLabel[status as ReservationStatus]}
            </button>
          ))}
        </div>
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
        {data?.date !== date && !error ? (
          <div className="loading-state">Loading reservations…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-list">
            <CalendarDays size={30} />
            <h2>
              {search || filter !== "all"
                ? "No matching reservations."
                : "A fresh page in the guest book."}
            </h2>
            <p>
              {search || filter !== "all"
                ? "Try another search or status filter."
                : "Reservations for this date will appear here."}
            </p>
          </div>
        ) : (
          <div className="reservation-table-wrap">
            <table className="reservation-table">
              <thead>
                <tr>
                  <th>Visit</th>
                  <th>Guest</th>
                  <th>Details</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((booking) => (
                  <tr key={booking.id}>
                    <td>
                      <strong>{displayTime(booking.time)}</strong>
                      <span>
                        {booking.guests} guests · {booking.durationMinutes} min
                      </span>
                    </td>
                    <td>
                      <strong>{booking.name}</strong>
                      <a href={`mailto:${booking.email}`}>{booking.email}</a>
                      <a href={`tel:${booking.phone.replace(/[^+\d]/g, "")}`}>
                        {booking.phone}
                      </a>
                      <small>{booking.reference}</small>
                    </td>
                    <td>
                      <strong>{booking.occasion}</strong>
                      <span className="table-notes">
                        {booking.notes || "No special requests"}
                      </span>
                    </td>
                    <td>
                      <span className={`status ${booking.status}`}>
                        {statusLabel[booking.status]}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        {transitions[booking.status].map((status) => (
                          <button
                            key={status}
                            disabled={busy === booking.id}
                            className={`action-button ${status === "cancelled" ? "danger" : ""}`}
                            onClick={() =>
                              status === "cancelled" || status === "no_show"
                                ? setPendingAction({
                                    reservation: booking,
                                    status,
                                  })
                                : void changeStatus(booking, status)
                            }
                          >
                            {busy === booking.id
                              ? "Saving…"
                              : actionLabels[status]}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="list-footnote">
          Times shown in Philippine time · Updates every 30 seconds ·{" "}
          {filtered.length} reservation{filtered.length !== 1 ? "s" : ""} shown
        </p>
      </div>
      {pendingAction && (
        <div className="modal-backdrop">
          <div
            className="panel action-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="action-title"
          >
            <h2 id="action-title">{actionLabels[pendingAction.status]}?</h2>
            <p>
              {pendingAction.reservation.name} ·{" "}
              {pendingAction.reservation.reference}
            </p>
            <p>This will update the guest’s reservation status.</p>
            {error && (
              <p className="message error" role="alert">
                {error}
              </p>
            )}
            <div className="form-actions">
              <button
                className="button button-outline"
                autoFocus
                disabled={busy !== null}
                onClick={() => setPendingAction(null)}
              >
                Go back
              </button>
              <button
                className="button button-danger"
                disabled={busy !== null}
                onClick={() =>
                  void changeStatus(
                    pendingAction.reservation,
                    pendingAction.status,
                  )
                }
              >
                {busy !== null ? "Saving…" : "Confirm change"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
function SettingsForm({
  settings,
  onSave,
  onClose,
}: {
  settings: ReservationSettings;
  onSave: (value: ReservationSettings) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState({ ...settings });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      onSave((await reservationAPI.updateSettings(draft)).data);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="panel settings-panel" onSubmit={submit}>
      <div className="detail-heading">
        <div>
          <h2>Reservation settings</h2>
          <p className="field-hint">
            Set Japz’s actual capacity and hours before accepting bookings.
          </p>
        </div>
        <button
          className="icon-button"
          type="button"
          disabled={busy}
          aria-label="Close settings"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      <div className="settings-grid">
        <label>
          Opening time
          <input
            required
            type="time"
            value={draft.openTime}
            onChange={(event) =>
              setDraft((value) => ({ ...value, openTime: event.target.value }))
            }
          />
        </label>
        <label>
          Closing time
          <input
            required
            type="time"
            value={draft.closeTime}
            onChange={(event) =>
              setDraft((value) => ({ ...value, closeTime: event.target.value }))
            }
          />
        </label>
        {(
          [
            { key: "capacity", label: "Total seats", min: 1, max: 500 },
            {
              key: "maxPartySize",
              label: "Maximum guests per booking",
              min: 1,
              max: 100,
            },
            {
              key: "durationMinutes",
              label: "Visit duration (minutes)",
              min: 30,
              max: 240,
            },
            {
              key: "slotIntervalMinutes",
              label: "Time slot interval (minutes)",
              min: 15,
              max: 60,
            },
            {
              key: "leadTimeMinutes",
              label: "Booking / change notice (minutes)",
              min: 0,
              max: 1440,
            },
            {
              key: "advanceDays",
              label: "Booking window (days)",
              min: 1,
              max: 365,
            },
          ] as const
        ).map(({ key, label, min, max }) => (
          <label key={key}>
            {label}
            <input
              type="number"
              required
              min={min}
              max={max}
              step={1}
              value={draft[key]}
              onChange={(event) =>
                setDraft((value) => ({
                  ...value,
                  [key]: Number(event.target.value),
                }))
              }
            />
          </label>
        ))}
      </div>
      <p className="field-hint">
        Existing bookings keep their visit duration. Capacity reductions cannot
        displace existing reservations. All times use Asia/Manila.
      </p>
      {error && (
        <div className="message error" role="alert">
          {error}
        </div>
      )}
      <button className="button" disabled={busy}>
        {busy ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
