# Light/Dark Mode with Toggle — Design

Date: 2026-06-15
Status: Approved (pending spec review)

## Problem

When the user's device is in dark mode the app is hard to read — large sections
render black-on-black. Root cause:

- **daisyUI 5** auto-switches its components to a dark theme when the OS reports
  `prefers-color-scheme: dark`. So shared chrome (Navbar, menus, buttons) goes
  dark automatically.
- Many pages use **hardcoded colors** (`bg-white`, `bg-black`, `text-black`,
  `text-white`, hex values like `#fff`, `#222`, `#1D1F2F`) that do **not**
  respond to the theme. Result: dark daisyUI chrome mixed with unreadable
  hardcoded sections.
- The shadcn-style CSS variables in `globals.css` define a full `:root` (light)
  and `.dark` (dark) palette, but **nothing ever applies the `.dark` class**, so
  that system is effectively unused.

## Goal

Add a working light/dark theme with a manual toggle. Default follows the OS
setting; the user's manual choice is remembered. Every page must be readable in
both modes. No layout changes, no visual redesign, no new palette — just make
existing colors respond to the theme and add the switch.

## Design

### 1. Single source of truth drives both color systems

The app has two color systems that must stay in sync. One theme value drives
both, applied to `<html>`:

- `data-theme="light" | "dark"` → drives **daisyUI** semantic classes
  (`bg-base-100`, `bg-base-300`, `text-base-content`, `btn`, `navbar`, `menu`,
  `card`, `modal`, …).
- `.dark` class → drives the **shadcn** CSS variables already defined in
  `globals.css` (the `@custom-variant dark (&:is(.dark *))` and `.dark { … }`
  block are already present).

### 2. `ThemeProvider` — `src/components/ThemeContext.jsx` (new)

Mirrors the existing `AuthContext` pattern (a `'use client'` context provider).

- State: `theme` is `'light' | 'dark'`.
- Initial resolution order: value in `localStorage` (key `theme`) → otherwise the
  OS preference via `window.matchMedia('(prefers-color-scheme: dark)')`.
- `toggleTheme()` flips the value, applies it, and writes it to `localStorage`.
- Applying a theme: set `document.documentElement.dataset.theme = theme` and
  `document.documentElement.classList.toggle('dark', theme === 'dark')`.
- While the user has made **no explicit choice** (nothing in `localStorage`),
  subscribe to `matchMedia` changes so the app tracks live OS changes. Once the
  user toggles manually, the stored choice wins and we stop following the OS.

### 3. No-flash inline script — `src/app/layout.jsx`

A small inline `<script>` in `<head>` (rendered as a raw `<script
dangerouslySetInnerHTML>` so it runs before hydration/paint) reads
`localStorage.theme` (falling back to `matchMedia`) and sets `data-theme` +
`.dark` on `<html>` immediately. This prevents a flash of the wrong theme on
load. `ThemeProvider` then takes over for runtime changes. Wrap the app with
`<ThemeProvider>` alongside the existing `<AuthProvider>`.

### 4. daisyUI configuration — `src/app/globals.css`

Change the daisyUI plugin registration so our toggle controls the theme instead
of daisyUI silently auto-following the OS:

```css
@plugin "daisyui" {
  themes: light --default, dark;
}
```

This registers `light` (default) and `dark` and makes daisyUI respond to our
`data-theme` attribute rather than `prefers-color-scheme`. (We still honor the OS
default ourselves via the no-flash script + provider.)

### 5. Toggle UI — `src/components/ThemeToggle.jsx` (new)

A small `'use client'` button with a sun/moon icon (lucide-react or
@tabler/icons-react — both already installed). Calls `toggleTheme()` from the
context. Placed in the Navbar's `navbar-end` so it appears on every page (the
Navbar is shared). Styled with daisyUI `btn btn-ghost btn-circle` to match the
existing nav.

### 6. Color fixes (surgical, ~13 files)

Replace hardcoded colors that break readability with theme-aware tokens:

- Where a file already uses daisyUI, prefer daisyUI semantic classes:
  `bg-base-100` / `bg-base-200` / `bg-base-300`, `text-base-content`,
  `text-base-content/70` for muted text, etc.
- Otherwise use the shadcn tokens: `bg-background`, `text-foreground`,
  `bg-card`, `text-muted-foreground`, `border-border`.

Candidate files (from grep of hardcoded `bg-white|bg-black|text-white|text-black`
and hex values):

- `src/app/login/page.jsx`
- `src/app/register/page.jsx`
- `src/app/clicker/clickergame.jsx`
- `src/app/minesweeper/minesweeperGame.jsx`
- `src/app/minesweeper/Popup.jsx`
- `src/app/snake/snakeGame.jsx`
- `src/app/wordle/Alert.jsx`
- `src/app/wordle/Guess.jsx`
- `src/app/wordle/Popup.jsx`
- `src/app/wordle/choose/Choose.jsx`
- `src/app/wordle/styles.css`
- `src/components/ui/button.jsx`
- `src/components/ui/carousel.jsx`
- `src/components/ui/typewriter-effect.jsx`

Plus shared pages that rely on daisyUI base classes already adapt automatically
once theming works (`Navbar.jsx`, `Leaderboard.jsx`, `profile/page.jsx`,
`quiz/quiz.jsx`).

**Game-intrinsic colors stay.** Wordle's black/white flip tiles, Minesweeper
number colors, snake/board colors, and similar self-contained game visuals are
part of the game's look and remain readable on their own. Only page-level and
container-level backgrounds/text that go unreadable in one mode are changed.
Each candidate file is inspected individually; a color is only changed if it
harms readability in light or dark.

## Out of scope

- Layout / spacing / typography changes.
- New color palette or rebranding.
- Per-page theme overrides or additional themes beyond light/dark.
- Server-side persistence of the preference (localStorage only).

## Testing / verification

- Toggle flips the whole app (chrome + content) between light and dark with no
  unreadable sections.
- Fresh load with OS in dark mode starts dark; OS in light starts light (no
  stored choice).
- After manually toggling, reload keeps the chosen theme regardless of OS.
- No flash of the wrong theme on initial load.
- Spot-check each previously-hardcoded page in both modes for readability.
