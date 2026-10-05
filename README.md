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
- **Gym** - weekly workout split with a list of exercises per day, flexible swaps and rest days, a done tick per day, and consistency and weight charts
- **Checklist** - a big "things to do today" list with overdue carry-over and quick add with a time and a priority tag
- **Schedule** - week strip with a dropdown month calendar, daily and weekly recurring tasks ("every Monday 9pm"), and URGENT / MUST DO / IMPORTANT tags
- **Reminders** - a Windows notification when a task comes due
- **Progress** - consistency line graph and daily completion bar chart
- **No-nicotine tracker** - weekly tickboxes, streak and weekly graph
- **Always on top** - drag, resize and hide panels like sticky notes
- **Multi-monitor** - resize panels from any edge, move everything to another monitor, or reset the layout from Settings
- **Tray control** - opacity, accent colour, always-on-top, launch at startup, Exit
- **Starts with Windows** - opens your day's tasks on boot

## Installation

Build the Windows installer on a Windows machine with Node 20.19+:

```bash
git clone https://github.com/JiroDavid/shimaDo.git
cd shimaDo
npm install
npm run dist
```

Run `dist/ShimaDo Setup 0.1.0.exe`. It installs ShimaDo for your user and adds Start menu and desktop shortcuts. Open it from Start, right-click its taskbar button and choose "Pin to taskbar", or right-click the Start entry and pin it to Start or the taskbar. It starts with Windows by default and can be turned off in Settings.

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
