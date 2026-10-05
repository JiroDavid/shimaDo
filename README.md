<div align="center">
  <img src="assets/logo.svg" alt="ShimaDo" width="160" height="160"/>

  <h1>ShimaDo</h1>
  <p><strong>Floating always-on-top to-do panels with a Japanese retro Linux feel - local, private, yours</strong></p>

  [![Electron](https://img.shields.io/badge/Electron-44-47848F?style=flat-square&logo=electron&logoColor=white)](https://www.electronjs.org)
  [![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
  [![Tailwind](https://img.shields.io/badge/Tailwind-3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
  [![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vite.dev)
  [![Platform](https://img.shields.io/badge/Platform-Windows-0078D6?style=flat-square&logo=windows&logoColor=white)](#installation)
  [![License](https://img.shields.io/badge/License-MIT-22c55e?style=flat-square)](LICENSE)

</div>

---

ShimaDo is a personal desktop to-do app made of small floating panels that stay on top of everything, even Discord. Tick off tasks, schedule recurring ones, get reminders, and track your progress and nicotine-free days. All data stays on your machine.

## Features

- **Main bar** - taskbar-style launcher with your profile picture, icon buttons with hover labels and a confirmed Exit button
- **Profile** - username, name, date of birth, height and a profile picture
- **Gym** - weekly workout split with per-day exercises, flexible day swaps and rest days, set logging, and charts for consistency, weight trend and strength
- **Checklist** - today's tasks with overdue carry-over and a quick-add line
- **Schedule** - week strip, daily and weekly recurring tasks ("every Monday 9pm"), clear dates and times
- **Reminders** - a Windows notification when a task comes due
- **Progress** - consistency line graph and daily completion bar chart
- **No-nicotine tracker** - weekly tickboxes, streak and weekly graph
- **Always on top** - drag, resize and hide panels like sticky notes
- **Tray control** - opacity, accent colour, always-on-top, launch at startup, Exit
- **Starts with Windows** - opens your day's tasks on boot

## Installation

Download the installer from the latest release, or build it yourself:

```bash
git clone https://github.com/JiroDavid/shimaDo.git
cd shimaDo
npm install
npm run dist
```

Run the build on Windows. The installer appears in `dist/`.

## Development

```bash
npm install
npm run dev        # run the app
npm test           # unit tests
npm run typecheck
```

## Usage

Closing a panel hides it; ShimaDo keeps running in the system tray. Right-click the tray icon to show panels, change opacity and accent, toggle always-on-top and launch at startup, or **Exit ShimaDo** to quit fully.

## Data

Stored locally in `%APPDATA%/ShimaDo/shimado-data.json`.

## License

[MIT](LICENSE)
