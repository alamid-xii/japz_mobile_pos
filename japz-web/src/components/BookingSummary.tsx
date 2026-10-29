import { CalendarDays, Clock3, Users, UtensilsCrossed } from "lucide-react";
import {
  displayDate,
  displayTime,
  statusLabel,
  type BookingData,
  type Reservation,
} from "../services/reservations";

export default function BookingSummary({
  booking,
}: {
  booking: Partial<BookingData> & Partial<Reservation>;
}) {
  return (
    <aside className="booking-summary">
      <div className="summary-top">
        <UtensilsCrossed size={24} />
        <span>YOUR TABLE AT JAPZ</span>
      </div>
      <h3>
        Something good
        <br />
        to look forward to.
      </h3>
      <dl>
        <div>
          <dt>
            <CalendarDays size={17} /> Date
          </dt>
          <dd>
            {booking.date ? displayDate(booking.date) : "Choose your date"}
          </dd>
        </div>
        <div>
          <dt>
            <Clock3 size={17} /> Time
          </dt>
          <dd>{booking.time ? displayTime(booking.time) : "Choose a time"}</dd>
        </div>
        <div>
          <dt>
            <Users size={17} /> Guests
          </dt>
          <dd>
            {booking.guests || 2}{" "}
            {(booking.guests || 2) === 1 ? "person" : "people"}
          </dd>
        </div>
        {booking.status && (
          <div>
            <dt>Status</dt>
            <dd>
              <span className={`status ${booking.status}`}>
                {statusLabel[booking.status]}
              </span>
            </dd>
          </div>
        )}
      </dl>
      <p>
        Japz Grill · Burger & Bistro
        <br />
        <span>All visit times are in Philippine time.</span>
      </p>
    </aside>
  );
}
