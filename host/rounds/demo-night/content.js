const entries = {
  "mcq-time-zones": {
    answer: "France",
    acceptable: ["France"],
    facts: ["France has 12 time zones because of its overseas territories.", "Russia has 11.", "The USA also reaches 11 when territories are included."],
    misconception: "Most people instinctively answer Russia.",
  },
  "mcq-fingerprints": {
    answer: "Koala",
    acceptable: ["Koala"],
    facts: ["Koala fingerprints are so similar to human fingerprints that they can reportedly confuse forensic investigators."],
  },
  "mcq-powered-flight": {
    answer: "Bat",
    acceptable: ["Bat", "Bats"],
    misconception: "Flying squirrels and sugar gliders glide rather than truly fly.",
  },
  "mcq-octopus-hearts": {
    answer: "3",
    acceptable: ["3", "Three"],
    facts: ["Two hearts pump blood to the gills.", "One heart pumps blood around the body."],
  },
  "mcq-oldest-university": {
    answer: "University of Bologna",
    acceptable: ["University of Bologna", "Bologna"],
    facts: ["Founded in 1088.", "Older than Oxford."],
  },
  "mcq-shortest-day": {
    answer: "Jupiter",
    acceptable: ["Jupiter"],
    facts: ["A day lasts about 10 hours despite Jupiter being the largest planet."],
  },
  "mcq-least-letter": {
    answer: "Q",
    acceptable: ["Q", "The letter Q"],
  },
  "mcq-chess-squares": {
    answer: "204",
    acceptable: ["204"],
    misconception: "Not just the visible 64: count every possible square size.",
  },
  "fastest-shakespeare": {
    answer: "Any genuine Shakespeare play",
    acceptable: ["Any accepted title; use judgement for shortened titles."],
    facts: ["There are about 39 plays, depending on attribution."],
    scoring: "Award one manual bonus point if a player's answer is unique.",
  },
  "fastest-italian-island": {
    answer: "Sicily",
    acceptable: ["Sicily"],
    facts: ["Home to Mount Etna."],
    misconception: "Not Sardinia.",
  },
  "fastest-australian-coastline": {
    answer: "Western Australia",
    acceptable: ["Western Australia", "WA"],
    facts: ["Its coastline is around 20,800 km, depending on measurement method."],
  },
  "fastest-jupiter-moon": {
    answer: "Any genuine moon of Jupiter",
    acceptable: ["Any confirmed Jovian moon."],
    facts: ["The Galilean moons are Io, Europa, Ganymede and Callisto."],
    scoring: "Mark manually; spelling need only be recognisable.",
  },
  "fastest-beethoven": {
    answer: "Beethoven",
    acceptable: ["Beethoven", "Ludwig van Beethoven"],
    facts: ["Piece: Symphony No. 5.", "The famous opening has been described as Fate knocking at the door."],
    media: "Local clip: composers/beethoven-symphony-5.mp3.",
  },
  "fastest-strauss": {
    answer: "Richard Strauss",
    acceptable: ["Richard Strauss", "R. Strauss"],
    facts: ["Piece: Also sprach Zarathustra.", "Made famous for modern audiences by 2001: A Space Odyssey."],
    misconception: "Not Johann Strauss.",
    media: "Local clip: composers/strauss-also-sprach-zarathustra.mp3.",
  },
  "fastest-vivaldi": {
    answer: "Antonio Vivaldi",
    acceptable: ["Antonio Vivaldi", "Vivaldi"],
    facts: ["Piece: Spring from The Four Seasons.", "Published in 1725."],
    media: "Local clip: composers/vivaldi-spring.mp3.",
  },
  "fastest-holst": {
    answer: "Gustav Holst",
    acceptable: ["Gustav Holst", "Holst"],
    facts: ["Piece: Mars from The Planets."],
    misconception: "Frequently mistaken for Star Wars because of its influence.",
    media: "Local clip: composers/holst-mars.mp3.",
  },
  "closest-elephant": { answer: "660 days", facts: ["About 22 months."] },
  "closest-iceland": { answer: "Approximately 400,000", scoring: "Treat the supplied target as 400,000." },
  "closest-australian-flag": { answer: "6" },
  "closest-london-eye": { answer: "32", facts: ["There is no capsule numbered 13."] },
  "closest-piano": { answer: "88", facts: ["A standard modern piano has 52 white and 36 black keys."] },
  "closest-rubiks": { answer: "54", facts: ["Nine coloured stickers appear on each of six faces."] },
  "closest-monopoly": { answer: "40" },
  "closest-tennis-ball": { answer: "2", facts: ["The two curved felt seams form one continuous dumbbell-shaped path."] },
  "closest-wine-bottle": { answer: "750 ml" },
  "closest-dice-dots": { answer: "42", facts: ["Each die totals 21 pips."] },
  "closest-scrabble": { answer: "100 tiles", facts: ["The English-language set includes two blank tiles."] },
  "closest-adult-bones": { answer: "206", facts: ["Babies begin with more bones; several fuse during growth."] },
  "closest-olympic-pool": { answer: "50 metres" },
  "closest-week-minutes": { answer: "10,080", facts: ["7 × 24 × 60."] },
  "closest-playing-cards": { answer: "52" },
  "closest-golf-ball": {
    answer: "Approximately 336",
    scoring: "Golf-ball designs vary; use 336 as the target supplied for this round.",
    facts: ["Many common designs use 300–500 dimples."],
  },
};

for (const id of [
  "best-vegemite",
  "best-prime-minister",
  "best-olympic-event",
  "best-superhero",
  "best-autobiography",
  "best-public-holiday",
]) {
  entries[id] = {
    answer: "Host's choice",
    scoring: "Read the answers aloud, then award 0–5 points to each response.",
  };
}

export const definitionContent = {
  Callipygian: {
    pronunciation: "kal-uh-PIJ-ee-un",
    definition: "Having shapely or beautifully formed buttocks.",
    origin: "From Greek kallos, beauty, and pygē, buttocks.",
    facts: ["Related to the classical Venus Callipyge — literally Venus of the beautiful buttocks."],
  },
  Crapulence: {
    pronunciation: "KRAP-yuh-luhns",
    definition: "Sickness or indisposition caused by excessive eating or drinking.",
    origin: "Through Latin crapula, excessive drinking or intoxication.",
    facts: ["It can also mean great intemperance, especially in drinking.", "It sounds modern, but English relatives such as crapulous date back centuries."],
  },
  Lalochezia: {
    pronunciation: "lal-oh-KEE-zee-uh",
    definition: "The use of vulgar or foul language to relieve stress or pain.",
    origin: "Built from Greek roots relating to speech and defecation.",
    facts: ["Research has found that swearing can increase pain tolerance in some circumstances."],
  },
  Quockerwodger: {
    pronunciation: "KWOK-uh-wod-juh",
    definition: "A wooden puppet controlled by strings; figuratively, a person or politician controlled by someone else.",
    origin: "Nineteenth-century British slang; the deeper origin is uncertain.",
    facts: ["Its political sense works exactly like calling someone a puppet whose strings are pulled elsewhere."],
  },
  Uhtceare: {
    pronunciation: "OOKHT-chair-uh",
    definition: "A poetic Old English expression associated with lying awake before dawn in anxiety or sorrow.",
    origin: "Old English ūht, the time before dawn, plus ċearu, care or sorrow.",
    facts: ["The popular modern spelling is historically an inflected form rather than the dictionary headword.", "It survives in the Old English poem The Wife's Lament."],
  },
  Clinomania: {
    pronunciation: "klin-oh-MAY-nee-uh",
    definition: "An excessive desire to remain in bed.",
    origin: "From Greek klinē, bed, and mania, obsession.",
    facts: ["It is a descriptive term, not a diagnosis in major medical manuals.", "It is often loosely associated with dysania, difficulty getting out of bed."],
  },
};

for (const [word, content] of Object.entries(definitionContent)) {
  entries[`definition-${word.toLowerCase()}`] = {
    answer: content.definition,
    pronunciation: content.pronunciation,
    origin: content.origin,
    facts: content.facts,
    scoring: "Correct definition: +2. Each opponent fooled by a fake definition: +1 to its author.",
  };
}

export function getHostContent(roundId) {
  return entries[roundId] ?? {};
}
