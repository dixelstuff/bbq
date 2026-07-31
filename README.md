# BBQ

A browser-based party show-running engine.

Milestone 1 proves the connection between three browser applications using
Firebase Anonymous Authentication and Realtime Database.

## Applications

Player and Host are deployed publicly through GitHub Pages. Display is a local
presentation application and is deliberately excluded from the public build.

### Local Display

The recommended workflow on the Mac is to double-click `Launch BBQ.command`.
It updates `/Users/andrew/bbq`, installs any changed dependencies, and starts
only the local Display.

Local Vite development pages clear their local and session storage when they
load, so development checks begin from a known state. Production GitHub Pages
storage is never cleared. The local Player development page also includes a
small connection diagnostics panel.

The equivalent Terminal commands are:

```sh
cd /Users/andrew/bbq || exit 1
git pull origin main
npm install
npm run display
```

Display opens at `http://127.0.0.1:5173/`. It communicates with the public Host
and Players only through Firebase; they do not depend on the Mac or its network.

## Firebase data

Milestone 1 uses one deliberately small path:

```text
sessions/default/
├── players/{anonymous-user-id}
└── state/step
```

Each player record contains a name and a joined timestamp. The record is removed
automatically when that player's Firebase connection closes.

Firebase Anonymous Authentication is stored independently by each browser, so
Safari, Chrome, and other browser profiles act as separate players. Tabs in the
same browser profile intentionally represent the same player.

The shared numeric step starts at `1`. The host can advance or reset it, and all
three applications receive updates live.

## Public deployment

Pushes to `main` deploy automatically to GitHub Pages:

- `https://dixelstuff.github.io/bbq/` — Player entry
- `https://dixelstuff.github.io/bbq/player/` — Player entry alias
- `https://dixelstuff.github.io/bbq/host/`

The Host route requires the lightweight party password gate from the Player
entry screen. Display is not included in the deployed artifact.
