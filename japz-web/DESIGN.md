---
version: alpha
name: JAPZ POS
description: A practical restaurant workspace retaining JAPZ yellow, white surfaces and restrained charcoal typography.
colors:
  primary: "#FFCE1B"
  on-primary: "#030213"
  background: "#f6f7f5"
  surface: "#ffffff"
  text: "#252525"
  muted: "#656963"
  border: "#e2e3e0"
  focus: "#665512"
typography:
  sans:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
  artwork:
    fontFamily: "Dancing Script, cursive"
rounded:
  control: "6px"
  panel: "8px"
spacing:
  page-desktop: "32px"
  page-mobile: "16px"
components:
  button:
    height: "44px"
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
  dialog:
    rounded: "{rounded.panel}"
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
  secondary-text:
    textColor: "{colors.muted}"
  border:
    backgroundColor: "{colors.border}"
  focus:
    backgroundColor: "{colors.focus}"
---

# JAPZ POS design context

## Overview

Restaurant staff use Admin, Cashier, Kitchen and Inventory workspaces. Preserve the recognizable yellow selection/action treatment and original restaurant logo. The reference is the existing Inventory workspace: compact navigation, clear data, bordered white surfaces and useful density. Avoid landing-page styling, decorative gradients, large empty cards and excessive pill shapes. English UI with Philippine peso amounts; this is not a Japan-market product.

## Colors

Runtime ownership stays in `tailwind.config.js` for `brand` and in `src/index.css` for `--app-*` surface, text, border and focus values. `inventory.css` consumes these variables through its established `--inv-*` aliases. This file documents those owners; it does not generate tokens. Yellow is a background or selection accent with dark text, never low-contrast yellow body text. Status colors retain their existing operational meaning. The application currently supports light mode only.

## Typography

Use existing Inter throughout; the variable font is served locally with swap and system fallbacks. Locally served Dancing Script is reserved for the existing printable QR review artwork. Use 24–26px page headings, 14px standard UI, smaller secondary metadata, and tabular numbers for data. Mobile text fields use 16px where practical. Keep forms and data readable at browser zoom.

## Layout

The application owns one vertical content scroller per workspace. Admin and Inventory use 232px desktop navigation and a modal drawer below 768px. Cashier and Kitchen retain desktop navigation and mobile bottom navigation. Preserve the Cashier collapse preference. POS owns menu and cart scrolling; its tablet menu adapts to two columns beside a narrower cart. Page padding is 32px desktop, 24px intermediate and 16px mobile. Tables scroll locally or use existing Inventory/mobile Menu record layouts. Natural-height forms stay reachable on short screens.

## Elevation & Depth

Use borders and neutral backgrounds for separation. Keep shadows for dialogs/notifications; avoid decorative card shadows and hover movement. Authentication uses a narrow yellow top rule instead of a full gradient.

## Shapes

Controls use 6px corners, panels and overlays 8px. Reserve circles for avatars, progress/status or rating controls. Preserve meaningful icons from lucide-react.

## Components

`src/components/Modal.tsx` owns native dialog modality, background isolation, Escape and focus restoration for legacy popups. `features/inventory/shared.tsx` retains the specialized form dialog with fixed header/footer and internal body scrolling. `FeedbackProvider.tsx` owns previously native alerts/confirmations. `Form.tsx` uses existing HTML constraints with inline errors and first-invalid-field focus. Native select and date/time pickers remain intentional platform controls.

Hover feedback is subtle. All interactive controls require visible keyboard focus; selected navigation uses the yellow accent, disabled controls reduce emphasis, busy controls preserve their dimensions. Errors use text and an alert region. Reduced-motion preferences override animations. See `UX-CONTRACT.md` for behavior and verification boundaries.
