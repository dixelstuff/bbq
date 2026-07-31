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
├── connections/{anonymous-user-id}/{connection-id}
├── lockedNames/{anonymous-user-id}
└── state/
    ├── step
    └── generation
```

Player records are durable for the current game. Temporary Firebase connection
records use `onDisconnect` cleanup, allowing Host to distinguish joined players
from their live connection status without losing scores, answers, or names.
`RESET GAME` replaces the complete session and increments its generation, which
invalidates saved identities in every open Player browser.

Firebase Anonymous Authentication is stored independently by each browser, so
Safari, Chrome, and other browser profiles act as separate players. Tabs in the
same browser profile intentionally represent the same player.

The shared numeric step starts at `1`. Names can be edited live while it remains
at `1`; the atomic session transaction snapshots and locks them as soon as Host
advances. Running-game clients read that snapshot, so a stale Screen 1 browser
cannot change the accepted names.
Host can advance or fully reset the game, and all three applications receive
updates live.

## Game engine

Progression is phase-based rather than screen-number based:

```text
lobby → question → marking → reveal → leaderboard → intermission
```

Game definitions provide content such as the question, local image, answer, and
Host notes. The shared engine owns submissions, timestamps, answer locking,
manual marks, scoring, reveals, and leaderboard ordering.

Game 1 is `Fastest Correct Answer`. The fastest correct submission receives two
points, later correct submissions receive one, and incorrect submissions
receive zero. Its placeholder koala image is bundled from `media/images/` to
exercise the local-media pipeline.

## Public deployment

Pushes to `main` deploy automatically to GitHub Pages:

- `https://dixelstuff.github.io/bbq/` — Player entry
- `https://dixelstuff.github.io/bbq/player/` — Player entry alias
- `https://dixelstuff.github.io/bbq/host/`

The Host route requires the lightweight party password gate from the Player
entry screen. Display is not included in the deployed artifact.
