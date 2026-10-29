import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  UtensilsCrossed,
  Users,
} from "lucide-react";

export default function Home() {
  return (
    <>
      <section className="hero container">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="tiny-dot" /> YOUR NEXT GOOD TIME STARTS HERE
          </span>
          <h1>
            Good food.
            <br />
            Great company.
            <br />
            <span>Your table awaits.</span>
          </h1>
          <p>
            Make room for the moments that matter. Reserve your spot at Japz
            Grill for burgers, bistro favorites, and time well spent.
          </p>
          <div className="hero-actions">
            <Link to="/reserve" className="button">
              Reserve a table <ArrowUpRight size={19} />
            </Link>
            <Link to="/manage" className="text-link">
              Already booked? <ArrowRight size={16} />
            </Link>
          </div>
          <div className="hero-note">
            <Check size={16} /> Easy online booking <span /> No account needed
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-image">
            <img
              src="/burgers2.jpg"
              alt="Japz Grill burger with cheese and fresh vegetables"
            />
            <div className="image-caption">
              <span>FRESH OFF THE GRILL</span>
              <strong>A little taste of Japz.</strong>
            </div>
          </div>
          <div className="since-stamp">
            GRILLED WITH LOVE
            <span>
              SINCE
              <br />
              <strong>2018</strong>
            </span>
            JAPZ GRILL
          </div>
          <div className="table-note">
            <UtensilsCrossed size={22} />
            <div>
              <strong>Bring your appetite.</strong>
              <span>We’ll save you a seat.</span>
            </div>
            <ArrowUpRight size={20} />
          </div>
        </div>
      </section>
      <section className="how-section">
        <div className="container">
          <div className="section-heading">
            <span className="eyebrow">LESS PLANNING. MORE ENJOYING.</span>
            <h2>A good time, in three steps.</h2>
          </div>
          <div className="steps-grid">
            {[
              {
                icon: CalendarDays,
                number: "01",
                title: "Pick your moment",
                description:
                  "Choose your date, party size, and an available time.",
              },
              {
                icon: Users,
                number: "02",
                title: "Make it yours",
                description:
                  "Add your contact details and any special requests.",
              },
              {
                icon: UtensilsCrossed,
                number: "03",
                title: "See you at Japz",
                description:
                  "Save your reference and check back for confirmation.",
              },
            ].map(({ icon: Icon, number, title, description }) => (
              <article className="how-card" key={number}>
                <div>
                  <Icon size={24} />
                  <span>{number}</span>
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="food-section container">
        <div className="food-heading">
          <div>
            <span className="eyebrow">COME HUNGRY. LEAVE HAPPY.</span>
            <h2>
              There’s a seat for
              <br />
              every kind of catch-up.
            </h2>
          </div>
          <p>
            A family meal, a birthday, or a just-because dinner. Your favorite
            people deserve a place at the table.
          </p>
        </div>
        <div className="food-grid">
          <article>
            <img
              src="/burgers2.jpg"
              alt="Burgers from Japz Grill"
              loading="lazy"
            />
            <div>
              <span>THE GRILL FAVORITES</span>
              <h3>Made for burger lovers.</h3>
            </div>
          </article>
          <article>
            <img
              src="/pasta2.jpg"
              alt="A pasta dish at Japz Grill"
              loading="lazy"
            />
            <div>
              <span>A LITTLE COMFORT</span>
              <h3>Good plates. Great company.</h3>
            </div>
          </article>
          <article>
            <img src="/coffee.jpg" alt="Japz coffee" loading="lazy" />
            <div>
              <span>STAY A LITTLE LONGER</span>
              <h3>Make time for a catch-up.</h3>
            </div>
          </article>
        </div>
      </section>
      <section className="bottom-cta container">
        <div>
          <span className="eyebrow">YOUR PEOPLE. YOUR PLANS. YOUR TABLE.</span>
          <h2>Let’s make it a Japz day.</h2>
        </div>
        <Link to="/reserve" className="button">
          Find a table <ArrowUpRight size={19} />
        </Link>
      </section>
    </>
  );
}
