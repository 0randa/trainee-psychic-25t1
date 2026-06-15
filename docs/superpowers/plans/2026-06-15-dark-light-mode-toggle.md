# Light/Dark Mode Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a working light/dark theme with a Navbar toggle that drives both color systems consistently, defaulting to the OS setting and remembering the user's manual choice.

**Architecture:** A single theme value (`'light' | 'dark'`) is applied to `<html>` as both `data-theme` (daisyUI) and a `.dark` class (the shadcn CSS variables already defined in `globals.css`). An inline script sets it before paint to avoid flashes; a React `ThemeProvider` manages runtime changes and persistence; a toggle button in the shared Navbar flips it. Hardcoded colors that break readability are swapped for theme-aware tokens; game-intrinsic colors are left alone.

**Tech Stack:** Next.js 15 (App Router), React 19, Tailwind CSS v4, daisyUI 5, shadcn-style CSS variables, lucide-react icons.

> **Note on testing:** This project has no test framework (no `test` script, no jest/vitest). Adding one solely for visual/theme work is out of scope. Verification is done with `npm run lint`, `npm run build`, and manual browser checks in both themes. All commands run from the `frontend/` directory.

---

## File Structure

**Create:**
- `frontend/src/components/ThemeContext.jsx` — theme state, persistence, OS-follow logic, `useTheme()` hook.
- `frontend/src/components/ThemeToggle.jsx` — the sun/moon toggle button.

**Modify:**
- `frontend/src/app/globals.css` — register explicit daisyUI `light`/`dark` themes.
- `frontend/src/app/layout.jsx` — no-flash inline script, `suppressHydrationWarning`, wrap app in `ThemeProvider`.
- `frontend/src/app/Navbar.jsx` — mount `ThemeToggle` in `navbar-end`.
- `frontend/src/app/login/page.jsx` — theme-aware page/card background.
- `frontend/src/app/register/page.jsx` — theme-aware page/card background.
- `frontend/src/app/minesweeper/Popup.jsx` — theme-aware modal background + close button.
- `frontend/src/app/wordle/Popup.jsx` — theme-aware modal background + close button.

**Audited, intentionally left unchanged** (game-intrinsic or already theme-aware) — see Task 8.

---

### Task 1: Register explicit daisyUI themes

**Files:**
- Modify: `frontend/src/app/globals.css:5`

- [ ] **Step 1: Change the daisyUI plugin registration**

Find this line near the top of `globals.css`:

```css
@plugin "daisyui";
```

Replace it with:

```css
@plugin "daisyui" {
  themes: light --default, dark;
}
```

This makes daisyUI respond to the `data-theme` attribute we control, instead of silently auto-following the OS `prefers-color-scheme` (the current cause of the half-dark UI). `light` stays the default; `dark` is available on demand.

- [ ] **Step 2: Verify the build still compiles**

Run: `cd frontend && npm run build`
Expected: build completes with no CSS/plugin errors.

- [ ] **Step 3: Commit**

```bash
cd frontend && git add src/app/globals.css
git commit -m "Register explicit daisyUI light/dark themes"
```

---

### Task 2: Create the ThemeProvider context

**Files:**
- Create: `frontend/src/components/ThemeContext.jsx`

- [ ] **Step 1: Create the provider**

Create `frontend/src/components/ThemeContext.jsx` with exactly this content:

```jsx
'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

const STORAGE_KEY = 'theme';

export const ThemeContext = createContext(null);

// Apply a theme to <html> for BOTH color systems:
// - data-theme drives daisyUI
// - the `dark` class drives the shadcn CSS variables in globals.css
function applyTheme(theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle('dark', theme === 'dark');
}

export function ThemeProvider({ children }) {
  // Start from whatever the no-flash inline script already resolved onto
  // <html>, so the provider never disagrees with what's painted.
  const [theme, setThemeState] = useState('light');

  useEffect(() => {
    const initial =
      document.documentElement.dataset.theme ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light');
    setThemeState(initial);

    // Follow OS changes ONLY while the user has made no explicit choice.
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event) => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        const next = event.matches ? 'dark' : 'light';
        applyTheme(next);
        setThemeState(next);
      }
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const setTheme = useCallback((next) => {
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
```

- [ ] **Step 2: Verify it lints**

Run: `cd frontend && npm run lint`
Expected: no errors for `src/components/ThemeContext.jsx`.

- [ ] **Step 3: Commit**

```bash
cd frontend && git add src/components/ThemeContext.jsx
git commit -m "Add ThemeProvider context for light/dark theme"
```

---

### Task 3: Add no-flash script and wrap the app

**Files:**
- Modify: `frontend/src/app/layout.jsx`

- [ ] **Step 1: Replace the layout file**

Replace the full contents of `frontend/src/app/layout.jsx` with:

```jsx
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/components/AuthContext";
import { ThemeProvider } from "@/components/ThemeContext";
import "leaflet/dist/leaflet.css";
// import Marquee from "react-fast-marquee";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

// Runs before paint so the correct theme is applied with no flash.
// Mirrors the resolution logic in ThemeContext: stored choice, else OS.
const themeInitScript = `(function(){try{var t=localStorage.getItem('theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.dataset.theme=t;document.documentElement.classList.toggle('dark',t==='dark');}catch(e){}})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

Notes: `suppressHydrationWarning` on `<html>` is required because the inline script mutates `data-theme`/`class` before React hydrates. The init script string is intentionally a duplicate of the provider's resolution rules (kept inline because it must run before any JS bundle loads).

- [ ] **Step 2: Verify build + lint**

Run: `cd frontend && npm run lint && npm run build`
Expected: both succeed, no hydration or import errors.

- [ ] **Step 3: Manual no-flash check**

Run: `cd frontend && npm run dev`, open the app with the OS in dark mode.
Expected: page loads dark immediately with no white flash. Switch OS to light and reload: loads light. (No toggle exists yet — that's Task 4.)

- [ ] **Step 4: Commit**

```bash
cd frontend && git add src/app/layout.jsx
git commit -m "Apply theme before paint and wrap app in ThemeProvider"
```

---

### Task 4: Add the theme toggle to the Navbar

**Files:**
- Create: `frontend/src/components/ThemeToggle.jsx`
- Modify: `frontend/src/app/Navbar.jsx`

- [ ] **Step 1: Create the toggle component**

Create `frontend/src/components/ThemeToggle.jsx` with exactly this content:

```jsx
'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="btn btn-ghost btn-circle"
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </button>
  );
}
```

- [ ] **Step 2: Import the toggle in the Navbar**

In `frontend/src/app/Navbar.jsx`, add this import after the existing imports (after the `useRouter` import line):

```jsx
import ThemeToggle from '@/components/ThemeToggle';
```

- [ ] **Step 3: Mount the toggle in `navbar-end`**

In `frontend/src/app/Navbar.jsx`, find this block:

```jsx
      <div className="navbar-end hidden lg:flex">
        <ul className="menu menu-horizontal px-1">
```

Replace those two lines with:

```jsx
      <div className="navbar-end gap-2">
        <ThemeToggle />
        <ul className="menu menu-horizontal px-1 hidden lg:flex">
```

This keeps the nav links desktop-only (`hidden lg:flex` moved onto the `<ul>`) while the toggle is always visible. The closing `</ul>` and `</div>` for this block are unchanged.

- [ ] **Step 4: Verify build + lint**

Run: `cd frontend && npm run lint && npm run build`
Expected: both succeed.

- [ ] **Step 5: Manual toggle check**

Run: `cd frontend && npm run dev`. Click the sun/moon button in the Navbar.
Expected: the entire app (Navbar, backgrounds, text) flips between light and dark. Reload: the chosen theme persists regardless of OS setting.

- [ ] **Step 6: Commit**

```bash
cd frontend && git add src/components/ThemeToggle.jsx src/app/Navbar.jsx
git commit -m "Add theme toggle button to Navbar"
```

---

### Task 5: Fix login and register page colors

**Files:**
- Modify: `frontend/src/app/login/page.jsx:42-43`
- Modify: `frontend/src/app/register/page.jsx:56-57`

Both pages have an identical wrapper: a `bg-blue-100` full-screen background and a `bg-white` card. In dark mode the card text (inherited `foreground`, now light) becomes unreadable on white. Swap both for daisyUI base tokens that adapt.

- [ ] **Step 1: Fix login page**

In `frontend/src/app/login/page.jsx`, find:

```jsx
    <div className="flex justify-center items-center w-full min-h-screen bg-blue-100">
      <div className="flex-col bg-white p-5 gap-3 rounded-lg">
```

Replace with:

```jsx
    <div className="flex justify-center items-center w-full min-h-screen bg-base-200">
      <div className="flex-col bg-base-100 text-base-content p-5 gap-3 rounded-lg shadow-lg">
```

- [ ] **Step 2: Fix register page**

In `frontend/src/app/register/page.jsx`, find:

```jsx
    <div className="flex justify-center items-center w-full min-h-screen bg-blue-100">
      <div className="flex-col bg-white p-5 gap-3 rounded-lg">
```

Replace with:

```jsx
    <div className="flex justify-center items-center w-full min-h-screen bg-base-200">
      <div className="flex-col bg-base-100 text-base-content p-5 gap-3 rounded-lg shadow-lg">
```

- [ ] **Step 3: Verify build + manual check**

Run: `cd frontend && npm run build`
Then `npm run dev` and visit `/login` and `/register` in both themes.
Expected: card and text are readable in light and dark; inputs/buttons (daisyUI) already adapt.

- [ ] **Step 4: Commit**

```bash
cd frontend && git add src/app/login/page.jsx src/app/register/page.jsx
git commit -m "Make login and register pages theme-aware"
```

---

### Task 6: Fix Wordle and Minesweeper result popups

**Files:**
- Modify: `frontend/src/app/minesweeper/Popup.jsx:7,23`
- Modify: `frontend/src/app/wordle/Popup.jsx:40,44`

Both popups use a `bg-white` panel with default (inherited) text and a `text-gray-500 hover:text-black` close button — unreadable in dark mode. Swap the panel and close button for theme tokens. The `bg-black/50` backdrop is intentional and stays.

- [ ] **Step 1: Fix minesweeper popup panel**

In `frontend/src/app/minesweeper/Popup.jsx`, find:

```jsx
      <div className="relative z-10 bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full text-center h-50">
```

Replace with:

```jsx
      <div className="relative z-10 bg-base-100 text-base-content p-8 rounded-2xl shadow-2xl max-w-md w-full text-center h-50">
```

- [ ] **Step 2: Fix minesweeper popup close button**

In `frontend/src/app/minesweeper/Popup.jsx`, find:

```jsx
          className="absolute top-2 right-4 text-gray-500 hover:text-black font-extrabold text-3xl"
```

Replace with:

```jsx
          className="absolute top-2 right-4 text-base-content/60 hover:text-base-content font-extrabold text-3xl"
```

- [ ] **Step 3: Fix wordle popup panel**

In `frontend/src/app/wordle/Popup.jsx`, find:

```jsx
      <div className="relative z-10 bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full text-center h-50">
```

Replace with:

```jsx
      <div className="relative z-10 bg-base-100 text-base-content p-8 rounded-2xl shadow-2xl max-w-md w-full text-center h-50">
```

- [ ] **Step 4: Fix wordle popup close button**

In `frontend/src/app/wordle/Popup.jsx`, find:

```jsx
          className="absolute top-2 right-4 text-gray-500 hover:text-black font-extrabold text-3xl"
```

Replace with:

```jsx
          className="absolute top-2 right-4 text-base-content/60 hover:text-base-content font-extrabold text-3xl"
```

- [ ] **Step 5: Verify build + manual check**

Run: `cd frontend && npm run build`
Then `npm run dev`, trigger a win/lose popup in `/minesweeper` and `/wordle` in both themes.
Expected: popup panel and text readable in both modes; close button visible.

- [ ] **Step 6: Commit**

```bash
cd frontend && git add src/app/minesweeper/Popup.jsx src/app/wordle/Popup.jsx
git commit -m "Make wordle and minesweeper popups theme-aware"
```

---

### Task 7: Audit remaining hardcoded colors (decide & document)

**Files (read-only audit; edit only if a real readability break is found):**
- `frontend/src/app/page.jsx`, `frontend/src/app/profile/page.jsx`, `frontend/src/app/Leaderboard.jsx`, `frontend/src/app/quiz/quiz.jsx` (daisyUI base classes — adapt automatically)
- `frontend/src/app/snake/snakeGame.jsx`, `frontend/src/app/wordle/Guess.jsx`, `frontend/src/app/wordle/styles.css`, `frontend/src/app/minesweeper/minesweeperGame.jsx`, `frontend/src/app/clicker/clickergame.jsx`, `frontend/src/app/wordle/Alert.jsx`, `frontend/src/components/ui/carousel.jsx`, `frontend/src/app/wordle/choose/Choose.jsx`, `frontend/src/components/ui/button.jsx`, `frontend/src/components/ui/typewriter-effect.jsx`

The remaining hardcoded colors fall into two "leave alone" buckets per the spec. This task is to **verify in the browser** (both themes) that each is acceptable, and only fix any that actually break.

- [ ] **Step 1: Confirm game-intrinsic colors render correctly in both themes**

Open each game in `npm run dev` in light AND dark mode and confirm the self-contained game visuals are readable (they have their own fixed palette by design):
- Wordle flip tiles (`bg-black text-white` in `Guess.jsx`, `styles.css` `.tile.front`) and colour states.
- Minesweeper board cells (`#cc9494`, `#fedfbf`, `#e8d0b8`, `#967f69`, `bg-red-600`).
- Snake canvas fills (`#e8481d`, `#d1e5e7`, `#deeded`, `#fff`, `#222`) — drawn on the canvas board.
- Clicker game-over overlay (`bg-black/80 text-white`).
- Wordle `Alert.jsx` button (`bg-black text-white`).
- GameCarousel card (`carousel.jsx`: `bg-[#1D1F2F]`, `text-white`, the `bg-white text-black` button on the dark card).

Expected: all are legible in both themes (they don't depend on the page theme). Leave unchanged.

- [ ] **Step 2: Confirm already-theme-aware components**

Confirm these already carry `dark:` variants and need no change:
- `components/ui/typewriter-effect.jsx` (`dark:text-white text-black`).
- `app/wordle/choose/Choose.jsx` (`bg-white dark:bg-neutral-900`).
- `components/ui/carousel.jsx:126` (`bg-neutral-200 dark:bg-neutral-800`).
- `components/ui/button.jsx` destructive variant (`text-white` on a red background — legible in both).

Expected: legible in both themes. Leave unchanged.

- [ ] **Step 3: Fix only genuine breaks (if any)**

If — and only if — a specific element is unreadable in one theme during Steps 1–2, fix that single element using the same token rules as Tasks 5–6:
- white/light surface → `bg-base-100` (or `bg-base-200`); pair with `text-base-content`.
- black/dark `text-*` that must sit on a theming surface → `text-base-content` (muted: `text-base-content/60`).
Do not alter the fixed-palette game visuals from Step 1.

- [ ] **Step 4: Commit (only if Step 3 made changes)**

```bash
cd frontend && git add -A
git commit -m "Fix remaining theme readability issues found during audit"
```

If no changes were needed, record that no fixes were required and move on.

---

### Task 8: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Lint and build clean**

Run: `cd frontend && npm run lint && npm run build`
Expected: both succeed with no errors.

- [ ] **Step 2: Cross-page manual matrix**

Run `cd frontend && npm run dev`. For each route — `/`, `/login`, `/register`, `/profile`, `/leaderboard`, `/wordle`, `/snake`, `/minesweeper`, `/clicker`, `/quiz` — verify in BOTH light and dark:
- No black-on-black or white-on-white / unreadable text.
- Navbar toggle present and flips the whole app.

- [ ] **Step 3: Persistence & default behavior**

- Clear `localStorage`, set OS to dark, load app → starts dark.
- Set OS to light, reload (still no stored choice) → starts light.
- Toggle manually to the opposite of OS, reload → keeps the manual choice.
Expected: all behaviors hold; no flash on any reload.

- [ ] **Step 4: Final confirmation**

Confirm all earlier task commits are in place: `cd frontend && git log --oneline -8`
Expected: commits for daisyUI themes, ThemeProvider, layout, toggle, login/register, popups, and (if any) audit fixes.
