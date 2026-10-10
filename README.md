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

ShimaDo is a personal desktop to-do app made of small floating panels that stay on top of everything, even Discord. Tick off tasks, schedule recurring ones, get reminders, and track your progress and any daily habits. All data stays on your machine.

## Features

- **Main bar** - taskbar-style launcher with your profile picture, icon buttons with hover labels and a confirmed Exit button
- **Profile** - username, name, date of birth, height and a profile picture
- **Gym** - weekly workout split with a list of exercises per day, flexible swaps and rest days, a done tick per day, and consistency and weight charts
- **Checklist** - a big "things to do today" list with overdue carry-over and quick add with a time and a priority tag
- **Schedule** - week strip with a dropdown month calendar, daily and weekly recurring tasks ("every Monday 9pm"), and URGENT / MUST DO / IMPORTANT tags; a Week view shows every day as an hourly timeline with colour-coded blocks, and tasks can have an optional end time
- **Reminders** - a Windows notification when a task comes due
- **Progress** - consistency line graph and daily completion bar chart
- **Habits** - track as many daily habits as you like (no nicotine, reading, water), each with its own name, icon, weekly tickboxes, streak and weekly graph
- **Notepad** - a simple autosaving scratch pad in its own window
- **Themes** - five built-in looks (Classic, Paper, Terminal, Sakura, Midnight) chosen on first launch or in Settings, each with four accent colours plus a custom colour picker
- **Edit mode** - click the pencil on the bar to restyle any panel element: colours, shadow, per-element accent, corner radius, border, text size and weight, labels, hide and size, for one element, several (Ctrl or Shift+click) or a whole group, with undo and live autosave. Recent custom colours are remembered, and a window's colours and accent can be saved as a style and applied to another window
- **Layers** - a side window lists every element and image of a window; click to select, drag to reorder in front or behind, and give cards a separate background layer so an image can sit between a card's fill and its content
- **Placement and media** - drag, resize (corner handles) and snap elements to guides, upload many images at once into a library, and use them as stickers or window backgrounds; images can be flipped, rotated, cropped, faded and rounded from the right-click menu, and anchor to the element underneath so they follow it when the layout changes
- **Desktop images** - Place puts an image in empty space on top of your windows; drag it over a window to be asked whether to put it inside, and move it back out from the right-click menu
- **Zoom** - Ctrl +, Ctrl - and Ctrl 0 change how large a window's content looks without resizing the window
- **Always on top** - drag, resize and hide panels like sticky notes
- **Multi-monitor** - resize panels from any edge, move everything to another monitor, or reset the layout from Settings
- **Tray control** - opacity, accent colour, always-on-top, launch at startup, Exit
- **Spotify** - a Now Playing tab with three styles (Classic, Compact, Visualizer), playback controls, and listening stats (top artists and tracks, minutes per day), using your own free Spotify developer app (registering one needs Spotify Premium)
- **Updates** - checks GitHub Releases, asks before downloading, and restarts into the new version on request
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

## Releasing

1. Bump `version` in `package.json` and commit.
2. `git tag v0.6.0` (must match the version) and `git push --tags`.
3. The Release workflow builds the installer and publishes it to GitHub Releases. Installed copies find it within 6 hours, or straight away via Settings > Check for updates.

The first updater-enabled version has to be installed by hand once. Installers are unsigned, so Windows SmartScreen may warn on a fresh install (in-place updates are unaffected).

## Spotify setup

ShimaDo talks to Spotify through a free developer app that you create once. Creating one needs a Spotify Premium account. The same steps are in Settings > Spotify, with buttons for the dashboard and the redirect address.

1. Open https://developer.spotify.com/dashboard, log in, accept the terms and click **Create app**.
2. Give it any name and description, for example "ShimaDo".
3. Under **Redirect URIs** enter `http://127.0.0.1:53682/callback` and press the **Add** button next to the box. It must appear as a listed item.
4. Tick **Web API** only, agree to the terms and click **Save**.
5. Open the new app, go to **Settings** and copy the **Client ID**. You do not need the client secret.
6. In ShimaDo open Settings > Spotify, paste the Client ID, click **Connect Spotify** and approve it in the browser tab that opens.

Playback controls (play/pause, next/previous, seek, volume) need Spotify Premium and one extra permission: if you connected before v0.9.0, click "Reconnect to enable controls" once. The Visualizer style listens to your computer's audio output on Windows to draw the bars; it reacts to all system sound, runs only while the panel is showing it, and nothing is recorded.

Common mistakes: using `localhost` instead of `127.0.0.1`, typing the redirect address but not pressing **Add**, or pasting the client secret instead of the Client ID.

Only the last 50 plays can be backfilled after ShimaDo has been closed, so heavy listening while it is off leaves gaps in the stats. Listening time counts each play at full track length. History stays on your computer in `spotify-history.json`.

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
