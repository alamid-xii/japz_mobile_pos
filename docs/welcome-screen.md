# JAPZ GRILL welcome screen

The customer welcome screen presents a padded official logo card, **Made fresh. Delivered happy.**, **Your favorites are one tap away.**, line-art rider, yellow **Get Started**, optional **Track my order**, and one store-status line in that order. It has no header logo, theme control, footer slogan or delivery-time estimate.

Hand-drawn burger, fries and drink icon badges frame the 3.6-second delivery scene, with a subtle brand halo behind the rider. The rider wears a yellow helmet, bobs along the moving road and brakes at the door. The yellow box carries an orange flame, follows a short arc and lands with a soft bounce. A delivery check badge and brief sparkles complete the arrival. Get Started fades in after the animation finishes naturally. The welcome screen has no Skip button. Reduced motion immediately shows a static final frame with the food icons and delivery check visible. The existing once-per-session welcome/menu behavior remains in use.

The button is not automatically focused when the timer finishes. Keyboard navigation still receives a visible focus outline; pointer focus does not. Logo padding, darker secondary text and height-based spacing keep the primary action fully visible down to a tested 320×480 viewport.

Opening status comes from the existing public store-status response. The welcome shows **Open now**, or **Closed · Opens at [opening time]** using the configured Philippine store hours. Loading and failed requests show honest checking/unavailable states. No opening time or delivery estimate is invented.

All customer ordering pages follow the device appearance until the customer chooses otherwise. A 44×44 sun/moon button appears in the shared header on every ordering page except the welcome screen, with the next action announced as **Switch to dark mode** or **Switch to light mode**. This includes Home, Menu, Cart/checkout, Reserve, Orders/tracking, Profile, customer sign-in and payment return. Choices persist locally and theme changes fade over 250ms. Reduced motion suppresses the fade. ERP and staff login pages retain their original light appearance, as confirmed for this update.

The customer shell keeps its header mounted while a menu or other child page loads, preserving keyboard focus on the header controls. Existing cart, checkout, tracking, authentication and install behavior remain in place.

On desktop (1024px and wider), the restaurant name, store status/hours, six navigation links, installation offer and account/theme controls share one row. Compact desktop widths use text navigation and an install icon; wider desktops also show navigation icons and the Install App label. Phones and tablets keep their bottom navigation and a compact header. The separate ERP landing page at `/` no longer has the Order food online button; the customer site remains available directly at `/japz` and legacy `/order` links.

Changed files in this update:

- `japz-web/src/components/OrderingIntro.tsx` — welcome hierarchy, Get Started, keyboard focus and real store status.
- `japz-web/src/styles/ordering-intro.css` — compact responsive layout, padded logo, readable text and rider/button animation.
- `japz-web/src/assets/rider.svg` — tighter illustration framing, yellow box and orange flame.
- `japz-web/src/components/ThemeToggle.tsx` — accessible sun/moon icon button.
- `japz-web/src/styles/theme.css` — 44px target and theme fade.
- `japz-web/src/theme.ts` — theme-transition lifecycle with reduced-motion support.
- `japz-web/src/pages/public/storefront/StorefrontLayout.tsx` — shared ordering theme control, one-row desktop header, store data passed to welcome, stable header while child pages load.
- `japz-web/src/styles/storefront.css` — one-row desktop navigation and responsive mobile/tablet header.
- `japz-web/src/pages/public/storefront/components/FloatingCart.tsx` — matches the 1024px desktop-navigation breakpoint so tablets have one cart summary.
- `japz-web/src/pages/Welcome.tsx` — removed the online-ordering button from the ERP landing page.
- `japz-web/tests/ordering-experience.spec.ts` — welcome layout, natural animation completion, Get Started and tracking, focus, real status, themes across customer pages, desktop header bounds and existing customer flows.
- `japz-web/tests/inventory.spec.ts` — updated assertion that staff screens have no customer theme button.
- `docs/japz-food-and-auto-clock-out.md` — refreshed ordering notes; this document provides the current welcome specification.
- `docs/welcome-screen.md` — this change report.

No backend, database schema, payroll rule or dependency changes are required.
