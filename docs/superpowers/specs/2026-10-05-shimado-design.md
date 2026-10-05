# ShimaDo - Design Spec

A personal, local Windows to-do app made of floating always-on-top panels (sticky-note style) in the Japanese retro Linux aesthetic of the portfolio site.

## Goals

- Persistent panels that float over other apps (e.g. Discord).
- Clean checklist and scheduling with clear dates and times, plus daily and recurring tasks.
- Reminder notification when a task comes due.
- Progress tracking (consistency graph, daily bar chart).
- Side-panel nicotine-free tracker with weekly tickboxes and graphs.
- Customizable look (opacity, accent) controlled from the system tray.
- Closing windows keeps the app running; only tray Exit quits.
- Launches with Windows, opened (not hidden), so today's tasks are the first thing visible.

## Non-goals (v1)

Cloud sync, accounts, categories or priorities, snooze, mobile.

## Stack

Electron + Vite + React + TypeScript + Tailwind. Developed in WSL2, built and run on Windows. Portfolio design tokens reused.

## Architecture

- **Main process** owns the tray, panel windows, scheduler, notifications and storage. It exposes a small typed IPC API; renderers never touch disk.
- **Panels** are four frameless, transparent, always-on-top native windows. Each is a route of one React app: `#/checklist`, `#/schedule`, `#/progress`, `#/nicotine`. Position, size and visibility persist. Closing a panel hides it; the tray re-shows it.
- **Tray menu:** show/hide each panel, always-on-top toggle, opacity, accent theme, launch at startup, Exit (only way to fully quit).
- **Storage:** one versioned JSON file in `%APPDATA%/ShimaDo`, written atomically.
- **Scheduler:** main process ticks every 30s, expands recurring rules into occurrences on demand, and fires a Windows notification at the due time. Clicking it opens the Checklist panel. Reminders missed while the app was off are skipped.
- **Startup:** launch at startup is **on by default** (login item). On launch the app opens visible: Checklist shows today's tasks, other panels restore to their saved bounds and visibility.

## Data model

- `tasks`: `{ id, title, notes?, kind: once | daily | weekly, date?, time, weekdays?, createdAt, archivedAt? }`. "Every Monday 9pm" = `weekly`, `weekdays: [1]`, `time: "21:00"`.
- `completions`: `{ taskId, occurrenceDate, doneAt }`. One row per completed occurrence; recurring tasks have no per-occurrence rows otherwise.
- `nicotine`: `{ [YYYY-MM-DD]: true }`.
- `settings`: opacity, alwaysOnTop, accent, launchAtStartup (default true), per-panel bounds and visibility.

## Panels

- **Checklist:** today's tasks sorted by time, overdue pinned on top in brick red, done items struck through with sage tick, quick-add line at bottom (Enter adds for today).
- **Schedule:** Mon-Sun week strip with dots on days that have tasks; click a day to list its tasks with date and time; add/edit/delete form with once/daily/weekly, weekday picker, time field.
- **Progress:** 30-day consistency line chart (completion rate), 7-day bar chart (tasks ticked per day), stats for current streak and this week's total.
- **Nicotine (narrow):** Mon-Sun tickboxes for the current week (future days disabled), streak counter, clean-days-per-week chart for the last 8 weeks.

## Look

Portfolio tokens: cream `#DCC9A9`, brick `#B83A2D`, sage `#4E6851`, dark `#0d0c09`, panel `#111009`, border `#22211c`, muted `#7a6e5a`. Monospace font, corner ornaments, dot titlebar buttons. Opacity applies to the panel background only so text stays readable.

## Testing

Unit tests for recurrence expansion, streak and consistency calculations, and storage migration/atomic write. Manual check of tray behavior, always-on-top over another app, notifications and startup launch on Windows.

## Repo conventions

Conventional Commits, no Claude attribution in commits, regular commits pushed to `JiroDavid/shimaDo`. README with centered logo and flat-square badges in the style of ShimaTTS and twitchtok-showcase.
