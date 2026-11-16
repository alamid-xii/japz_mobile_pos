---
name: Payroll UI Guidelines
description: UI and styling rules for the frontend React/Tailwind application to ensure a premium, modern design.
---

# UI/UX Guidelines for the System

When creating or modifying frontend components, you MUST adhere to the following design rules:

## 1. Color Palette & Theming
*   **Primary Action Color:** Indigo (`bg-indigo-600`, `hover:bg-indigo-700`).
*   **Surface Colors:** Use `bg-white` for cards and panels. The main application background should be `bg-slate-50`.
*   **Text Colors:** `text-slate-800` for primary text (headings), `text-slate-500` for secondary/supporting text.
*   **Status Colors:** 
    *   Success/Active/Paid: Emerald (`text-emerald-600`, `bg-emerald-100`)
    *   Error/Unpaid/Missing: Rose (`text-rose-600`, `bg-rose-100`)
    *   Warning/Pending: Amber (`text-amber-600`, `bg-amber-100`)

## 2. Component Styling
*   **Cards & Panels:** Must use soft shadows (`shadow-sm` or `shadow-md`), rounded corners (`rounded-xl` or `rounded-2xl`), and subtle borders (`border border-slate-200`). Avoid flat, borderless designs unless explicitly requested.
*   **Buttons:** Must have interactive states. Use `hover:bg-indigo-700` (or appropriate color), focus rings (`focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`), and smooth transitions (`transition-all duration-200`).
*   **Data Tables:** 
    *   Clean borders (`divide-y divide-slate-200`).
    *   Table headers should have a subtle background (`bg-slate-50`) and small uppercase text.
    *   Row hover states (`hover:bg-slate-50`) to improve readability.

## 3. Icons & Typography
*   **Icons:** Use **Lucide React** (`lucide-react`) for all icons. Standard sizes are `w-5 h-5` for general use and `w-4 h-4` for smaller UI elements. Color them with `text-slate-400` or the primary color depending on context.
*   **Typography:** Maintain a clean hierarchy using standard Tailwind text sizes (e.g., `text-xl font-semibold` for page titles).

## 4. Layout & Responsiveness
*   **Mobile-First:** Ensure all layouts adapt to smaller screens. Tables should scroll horizontally or convert to card views on mobile.
*   **Spacing:** Use generous padding and margins (e.g., `p-6` or `p-8` for cards) to let the content breathe. Do not cram elements together.

## 5. General Aesthetic
*   The goal is a **"Premium"** and **"Modern"** feel (e.g., Glassmorphism hints, dynamic animations, clean lines). Avoid generic, blocky designs. Make it look professional.
