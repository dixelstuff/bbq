# BBQ

A browser-based party show-running engine.

The three browser applications communicate through Firebase Anonymous
Authentication and Realtime Database.

## Applications

Player and Host are deployed publicly through GitHub Pages. Display is a local
presentation application and is deliberately excluded from the public build.

### Local Display

The recommended workflow on the Mac is to double-click `Launch BBQ.command`.
It updates `/Users/andrew/bbq`, installs any changed dependencies, and starts
only the local Display.

The equivalent Terminal commands are:

```sh
cd /Users/andrew/bbq || exit 1
git pull origin main
npm install
npm run display
```

Display opens at `http://127.0.0.1:5173/`. It communicates with the public Host
and Players only through Firebase; they do not depend on the Mac or its network.

### Local audio

Place Host-supplied recordings under `media/audio/`. The Display serves and
plays them locally; Firebase synchronises only Host playback commands and
readiness/error status. Audio is never uploaded to Firebase or sent to Player
phones.

Round definitions may specify a filename, start offset and excerpt duration.
The Host can play, replay, extend by five seconds or stop a clip, while the
Display always stops configured excerpts automatically. See
[`media/audio/README.md`](media/audio/README.md) for the folder layout,
supported formats and configuration examples.

## Firebase data

The shared session keeps durable players separate from live connections:

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

The shared numeric step starts at `1`. Names update only when Players confirm
them while in the lobby. The atomic session transaction snapshots and locks
them as soon as Host advances. Running-round clients read that snapshot, so a
stale lobby browser cannot change accepted names.
Host can advance or fully reset the game, and all three applications receive
updates live.

## Game engine

Progression is phase-based rather than screen-number based:

```text
lobby → question → marking → reveal → intermission
```

The leaderboard is a temporary Host-controlled presentation that can be shown
and dismissed at any time. It is not inserted automatically between questions.

The game/session contains rounds. Each round defines its round type, content,
media visibility, submission policy, and scoring strategy. The shared engine
owns submissions, timestamps, answer locking, ranking, score overrides,
reveals, and leaderboard ordering.

The sample rounds are `FASTEST FREE TEXT` and `CLOSEST WINS`. Shared media is
Display-only by default and is resolved from the local Display media library,
so the koala asset is not included in the public Player/Host deployment.

## Bespoke rounds and grouping

Rounds may own custom flow and interface behavior while consuming shared
session services. The Spelling Bee pairing prototype lives under
`shared/rounds/spelling-bee/`, with its local Display media adapter under
`display/rounds/spelling-bee/`.

The grouping service is independent from rounds and supports individuals,
pairs, groups of three, two teams and custom groups. A grouping can be random,
manually edited, reused or regenerated. Turn-based rounds share an active group
through Firebase. Group awards credit every current member and are retained in
round history before the next round starts.

Grouping generation uses the complete connected-player set. Odd PAIRS groups
finish with three members rather than creating a singleton. TWO TEAMS produces
two randomized teams whose sizes differ by at most one. The Host can reassign
members manually and can temporarily present all assignments on the Display.

Every production build and local Display build carries its Git commit as a
release identifier. The first updated Host or Display to connect resets the
Firebase session once for that release, preventing an old in-progress round
from surviving a code update. Release ordering prevents a Display still open
on older code from rolling the session back.

## Public deployment

Pushes to `main` deploy automatically to GitHub Pages:

- `https://dixelstuff.github.io/bbq/` — Player entry
- `https://dixelstuff.github.io/bbq/player/` — Player entry alias
- `https://dixelstuff.github.io/bbq/host/`

The Host URL requests the lightweight party password directly. The Player page
does not expose Host access. Display is not included in
the deployed artifact.
