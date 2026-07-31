# Local audio assets

Audio is owned and supplied by the event Host. Do not commit recordings unless
you have permission to distribute them.

## Folders

```text
media/audio/
├── composers/
├── intros/
└── sfx/
```

The initial composer pack expects these filenames:

```text
composers/beethoven-symphony-5.mp3
composers/strauss-also-sprach-zarathustra.mp3
composers/vivaldi-spring.mp3
composers/holst-mars.mp3
composers/mozart-eine-kleine-nachtmusik.mp3
composers/tchaikovsky-swan-lake.mp3
```

Only the first four are referenced by the current Demo Night questions. Mozart
and Tchaikovsky are reserved for future questions. Missing files are safe: the
local Display reports them and the Host shows a warning.

Reserved production filenames are:

```text
intros/spelling-bee-intro.mp3
intros/charades-intro.mp3
intros/fastest-free-text-intro.mp3
intros/closest-wins-intro.mp3
intros/bbq-mcq-intro.mp3
intros/my-definition-intro.mp3
sfx/correct.wav
sfx/wrong.wav
sfx/countdown.wav
sfx/time-up.wav
sfx/stinger.mp3
```

They are not wired into tonight's rounds yet.

## Supported formats

Use formats supported natively by the Display browser. MP3 is the recommended
default. WAV, M4A/AAC and Ogg may also work depending on the browser and codec.
For the Mac Display, MP3 and WAV are the most predictable choices.

## Round configuration

Add an `audio` object to a round definition:

```js
audio: {
  file: "composers/beethoven-symphony-5.mp3",
  start: 0,
  duration: 15,
}
```

- `file` is relative to `media/audio/`.
- `start` is the offset in seconds from the beginning of the recording.
- `duration` is the excerpt length in seconds.
- Decimal values are supported, for example `start: 32.5`.

PLAY and REPLAY seek to `start` and stop automatically after `duration`.
PLAY 5 MORE SECONDS continues from the current stopping point, extending an
active clip or resuming a clip that has just stopped. STOP pauses immediately.

Playback occurs only on the local Display. Firebase carries small playback
commands and readiness status; it never stores or transfers the audio file.

The same command/status transport is intentionally suitable for future video,
intro music, stingers, sound effects and background music.
