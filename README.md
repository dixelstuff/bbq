# BBQ

A browser-based party show-running engine.

Milestone 1 proves the connection between three browser applications using
Firebase Anonymous Authentication and Realtime Database.

## Applications

Player and Host are deployed publicly through GitHub Pages. Display is a local
presentation application and is deliberately excluded from the public build.

### Local Display

Install dependencies once, then start only Display:

```sh
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

The shared numeric step starts at `1`. The host can advance or reset it, and all
three applications receive updates live.

## Public deployment

Pushes to `main` deploy automatically to GitHub Pages:

- `https://dixelstuff.github.io/bbq/` — Player entry
- `https://dixelstuff.github.io/bbq/player/` — Player entry alias
- `https://dixelstuff.github.io/bbq/host/`

The Host route requires the lightweight party password gate from the Player
entry screen. Display is not included in the deployed artifact.
