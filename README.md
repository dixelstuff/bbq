# BBQ

A browser-based party show-running engine.

Milestone 1 proves the connection between three browser applications using
Firebase Anonymous Authentication and Realtime Database.

## Run locally

```sh
npm install
npm run dev
```

Open:

- `/display/` on the display
- `/host/` on the host's phone
- `/player/` on each player's phone

Vite prints the local address when it starts. To test with phones on the same
network, run `npm run dev -- --host`.

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
