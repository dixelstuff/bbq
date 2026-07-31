const entries = {
  "mcq-time-zones": {
    answer: "France",
    acceptable: ["France"],
    facts: ["France has 12 time zones because of its overseas territories.", "Russia has 11.", "The USA also reaches 11 when territories are included."],
    misconception: "Most people instinctively answer Russia.",
    research: [
      {
        title: "Why France beats Russia",
        intro: "The answer counts the overseas parts of a country, not only its mainland. France spans 12 standard time zones; for part of the year it can effectively span 13 because Saint-Pierre and Miquelon observes daylight saving time.",
        items: [
          "France — 12 standard zones across metropolitan France and overseas territories.",
          "Russia — 11 zones across one continuous landmass.",
          "United States — 11 when inhabited and uninhabited territories are included; 9 are used by states and inhabited territories.",
          "Australia — 9 standard zones when external territories are included; the mainland uses three principal standard zones.",
          "Useful comeback: Russia has the most consecutive time zones; France has the most overall.",
        ],
      },
    ],
  },
  "mcq-fingerprints": {
    answer: "Koala",
    acceptable: ["Koala"],
    facts: ["Koala fingerprints are so similar to human fingerprints that they can reportedly confuse forensic investigators."],
    research: [{
      title: "Why the other primates are tempting",
      items: [
        "Koalas have loops, whorls and ridges that are strikingly human-like even under a microscope.",
        "Chimpanzees, gorillas and orangutans also have friction ridges, so they sound plausible — but the celebrated forensic comparison is the koala.",
        "Koalas and humans evolved these patterns independently: it is an example of convergent evolution.",
        "A likely explanation is grip and sensitivity while climbing and handling eucalyptus leaves.",
      ],
    }],
  },
  "mcq-powered-flight": {
    answer: "Bat",
    acceptable: ["Bat", "Bats"],
    misconception: "Flying squirrels and sugar gliders glide rather than truly fly.",
    research: [{
      title: "Flying versus gliding",
      items: [
        "Bats generate lift and thrust by actively flapping wings formed from skin stretched over elongated finger bones.",
        "Flying squirrels launch and glide using a membrane called a patagium; they cannot gain altitude through powered wingbeats.",
        "Sugar gliders use the same basic gliding solution and steer with limbs and tail.",
        "Birds are powered fliers too, of course, but the question asks specifically for a mammal.",
      ],
    }],
  },
  "mcq-octopus-hearts": {
    answer: "3",
    acceptable: ["3", "Three"],
    facts: ["Two hearts pump blood to the gills.", "One heart pumps blood around the body."],
    research: [{
      title: "What all three hearts do",
      items: [
        "Two branchial hearts each push deoxygenated blood through one gill.",
        "The systemic heart sends oxygenated blood from the gills around the body.",
        "The systemic heart slows dramatically or can stop while the octopus swims, which helps explain why octopuses often prefer crawling.",
        "Their blood appears blue because it uses copper-rich haemocyanin rather than iron-rich haemoglobin to carry oxygen.",
      ],
    }],
  },
  "mcq-oldest-university": {
    answer: "University of Bologna",
    acceptable: ["University of Bologna", "Bologna"],
    facts: ["Founded in 1088.", "Older than Oxford."],
    research: [{
      title: "The age comparison — and the wording caveat",
      intro: "‘University’ and ‘continuously operating’ matter. Bologna is the conventional answer in the Western university tradition; broader definitions of higher-learning institutions can produce older candidates.",
      items: [
        "University of Bologna — conventionally dated to 1088, Italy.",
        "University of Oxford — teaching existed by 1096; no single foundation date.",
        "University of Salamanca — founded in 1218 and granted a royal charter earlier in the thirteenth century.",
        "University of Paris — active around 1150, but its historic institution was suspended during the French Revolution and later reorganised.",
        "Al-Qarawiyyin in Fez dates to 859 and is often called the oldest existing educational institution; whether its earliest form fits the modern university category is the source of the famous debate.",
        "Nalanda was far older, but it did not operate continuously into the modern era.",
      ],
    }],
  },
  "mcq-shortest-day": {
    answer: "Jupiter",
    acceptable: ["Jupiter"],
    facts: ["A day lasts about 10 hours despite Jupiter being the largest planet."],
    research: [{
      title: "Planet day lengths",
      intro: "These are rounded rotation periods, which is the intended meaning of ‘day’ here. A solar day can be defined differently, especially for Mercury and Venus.",
      items: [
        "Jupiter — about 10 hours (shortest).",
        "Saturn — about 11 hours.",
        "Neptune — about 16 hours.",
        "Uranus — about 17 hours.",
        "Earth — 24 hours.",
        "Mars — about 25 hours.",
        "Mercury — about 1,408 hours, or 58.6 Earth days, for one rotation.",
        "Venus — about 5,832 hours, or 243 Earth days, rotating backwards relative to most planets.",
      ],
      source: { label: "NASA Space Place", url: "https://spaceplace.nasa.gov/days/en/" },
    }],
  },
  "mcq-least-letter": {
    answer: "Q",
    acceptable: ["Q", "The letter Q"],
    facts: ["In broad English text-frequency tables, Q is usually the least common of the 26 letters."],
    misconception: "Z feels rarer because few English words begin with it, but Z appears more often inside common words and inflections than Q does overall.",
    research: [{
      title: "The useful qualification",
      items: [
        "Letter frequency changes with the corpus: novels, dictionaries, headlines and word-game tile sets are not identical samples.",
        "Q is commonly around 0.1% of letters in ordinary English text and is normally the bottom-ranked letter.",
        "Z, J and X are the other usual bottom contenders.",
        "Q is strongly tied to U in English, so it appears in relatively few letter combinations.",
        "If challenged, say: ‘For ordinary running English, Q; specialist or tiny samples can vary.’",
      ],
    }],
  },
  "mcq-chess-squares": {
    answer: "204",
    acceptable: ["204"],
    misconception: "Not just the visible 64: count every possible square size.",
    research: [{
      title: "The complete 204-square calculation",
      intro: "An 8×8 board contains squares of eight different sizes.",
      items: [
        "1×1: 64 squares",
        "2×2: 49 squares",
        "3×3: 36 squares",
        "4×4: 25 squares",
        "5×5: 16 squares",
        "6×6: 9 squares",
        "7×7: 4 squares",
        "8×8: 1 square",
        "Total: 64 + 49 + 36 + 25 + 16 + 9 + 4 + 1 = 204.",
        "Elegant version: 1² + 2² + … + 8² = 204.",
      ],
    }],
  },
  "fastest-shakespeare": {
    answer: "Any genuine Shakespeare play",
    acceptable: ["Any accepted title; use judgement for shortened titles."],
    facts: ["There are about 39 plays, depending on attribution."],
    scoring: "Award one manual bonus point if a player's answer is unique.",
    research: [{
      title: "Full play checklist (39)",
      intro: "Use this to verify less obvious answers. The total includes collaborations commonly accepted in modern Shakespeare editions.",
      items: [
        "All’s Well That Ends Well", "Antony and Cleopatra", "As You Like It", "The Comedy of Errors", "Coriolanus", "Cymbeline", "Edward III", "Hamlet", "Henry IV, Part 1", "Henry IV, Part 2", "Henry V", "Henry VI, Part 1", "Henry VI, Part 2", "Henry VI, Part 3", "Henry VIII", "Julius Caesar", "King John", "King Lear", "Love’s Labour’s Lost", "Macbeth", "Measure for Measure", "The Merchant of Venice", "The Merry Wives of Windsor", "A Midsummer Night’s Dream", "Much Ado About Nothing", "Othello", "Pericles", "Richard II", "Richard III", "Romeo and Juliet", "The Taming of the Shrew", "The Tempest", "Timon of Athens", "Titus Andronicus", "Troilus and Cressida", "Twelfth Night", "The Two Gentlemen of Verona", "The Two Noble Kinsmen", "The Winter’s Tale",
      ],
      source: { label: "Folger Shakespeare Library", url: "https://folgerpedia.folger.edu/William_Shakespeare%27s_plays" },
    }, {
      title: "Do not accept these common traps",
      items: [
        "The Sonnets — poetry collection, not a play.",
        "Venus and Adonis — narrative poem, not a play.",
        "The Prince of Denmark — a description of Hamlet, not its title.",
        "Rosencrantz and Guildenstern Are Dead — Tom Stoppard, not Shakespeare.",
        "Shakespeare in Love — a modern film and stage work.",
      ],
    }],
  },
  "fastest-italian-island": {
    answer: "Sicily",
    acceptable: ["Sicily"],
    facts: ["Home to Mount Etna."],
    misconception: "Not Sardinia.",
    research: [{
      title: "Largest Italian islands",
      items: [
        "Sicily — about 25,700 km²; largest island in Italy and the Mediterranean.",
        "Sardinia — about 24,100 km²; a close second and the tempting wrong answer.",
        "Elba — about 224 km².",
        "Sant’Antioco — about 109 km².",
        "Pantelleria — about 83 km².",
        "Sicily is separated from mainland Italy by the narrow Strait of Messina and contains Mount Etna.",
      ],
    }],
  },
  "fastest-australian-coastline": {
    answer: "Western Australia",
    acceptable: ["Western Australia", "WA"],
    facts: ["Its coastline is around 20,800 km, depending on measurement method."],
    research: [{
      title: "Official coastline comparison",
      intro: "Geoscience Australia’s nationally consistent figures include mainland coast plus islands. Coastline length changes with map scale, so quote these as dataset figures rather than eternal absolutes.",
      items: [
        "Western Australia — 20,788 km total (12,895 mainland + 7,894 islands).",
        "Queensland — 13,352 km total (6,967 mainland + 6,385 islands).",
        "Northern Territory — 10,954 km total (5,438 mainland + 5,516 islands).",
        "South Australia — 5,059 km total (3,815 mainland + 1,244 islands).",
        "Tasmania — 4,872 km total (2,827 main island + 2,046 other islands; rounding applies).",
        "Victoria — 2,515 km total (1,870 mainland + 645 islands).",
        "New South Wales — 2,101 km total (1,973 mainland + 128 islands).",
        "Western Australia still wins if you compare mainland coastline alone.",
      ],
      source: { label: "Geoscience Australia", url: "https://www.ga.gov.au/scientific-topics/national-location-information/dimensions/border-lengths" },
    }],
  },
  "fastest-jupiter-moon": {
    answer: "Any genuine moon of Jupiter",
    acceptable: ["Any confirmed Jovian moon."],
    facts: ["The Galilean moons are Io, Europa, Ganymede and Callisto."],
    scoring: "Mark manually; spelling need only be recognisable.",
    research: [{
      title: "Quick acceptance list",
      intro: "Jupiter has 101 confirmed moons as of March 2026. These are the names most likely to be offered; accept recognisable spellings.",
      items: [
        "Galilean moons: Io, Europa, Ganymede, Callisto.",
        "Inner moons: Metis, Adrastea, Amalthea, Thebe.",
        "Common outer-moon answers: Himalia, Elara, Pasiphae, Sinope, Lysithea, Carme, Ananke, Leda.",
        "Other valid named examples: Callirrhoe, Themisto, Megaclite, Taygete, Chaldene, Harpalyke, Kalyke, Iocaste, Erinome, Isonoe, Praxidike, Autonoe, Thyone, Hermippe, Aitne, Eurydome, Euanthe, Euporie, Orthosie, Sponde, Kale, Pasithee, Hegemone, Mneme, Aoede, Thelxinoe, Arche, Kallichore, Helike, Carpo, Eukelade, Cyllene, Kore, Herse, Dia, Valetudo, Pandia and Ersa.",
        "Do not accept Titan: it orbits Saturn. Triton orbits Neptune; Phobos and Deimos orbit Mars.",
      ],
      source: { label: "International Astronomical Union announcement", url: "https://www.iau.org/Iau/News/Ann2026/MPC-New-Moons-Saturn-Jupiter.aspx" },
    }],
  },
  "fastest-beethoven": {
    answer: "Beethoven",
    acceptable: ["Beethoven", "Ludwig van Beethoven"],
    facts: ["Piece: Symphony No. 5.", "The famous opening has been described as Fate knocking at the door."],
    media: "Local clip starts at 0:00 for the famous four-note opening.",
    research: [{
      title: "What to say after the reveal",
      items: [
        "Work: Symphony No. 5 in C minor, Op. 67.",
        "Composer: Ludwig van Beethoven (1770–1827).",
        "Written mainly between 1804 and 1808 and premiered in Vienna in 1808.",
        "The opening rhythm is three short notes followed by one long note.",
        "‘Fate knocking at the door’ is traditionally associated with the motif, but the reliability of that quotation is disputed.",
        "It is Beethoven, not Mozart: Mozart died when Beethoven was only 21, before this symphony was written.",
      ],
    }],
  },
  "fastest-strauss": {
    answer: "Richard Strauss",
    acceptable: ["Richard Strauss", "R. Strauss"],
    facts: ["Piece: Also sprach Zarathustra.", "Made famous for modern audiences by 2001: A Space Odyssey."],
    misconception: "Not Johann Strauss.",
    media: "Local clip starts at 0:18 as the recognisable sunrise fanfare arrives.",
    research: [{
      title: "Richard Strauss, not Johann Strauss",
      items: [
        "Work: Also sprach Zarathustra, Op. 30, a tone poem composed in 1896.",
        "Composer: Richard Strauss (1864–1949), unrelated to the famous Viennese waltz dynasty.",
        "The opening section is usually called Sunrise and contrasts a very low C with a blazing C-major climax.",
        "Stanley Kubrick’s 2001: A Space Odyssey made the fanfare inseparable from images of cosmic grandeur.",
        "Johann Strauss II wrote waltzes such as The Blue Danube — which also appears in 2001, making the confusion especially understandable.",
      ],
    }],
  },
  "fastest-vivaldi": {
    answer: "Antonio Vivaldi",
    acceptable: ["Antonio Vivaldi", "Vivaldi"],
    facts: ["Piece: Spring from The Four Seasons.", "Published in 1725."],
    media: "Local clip starts at 0:00.75, just after the recording's lead-in.",
    research: [{
      title: "The Four Seasons crib sheet",
      items: [
        "Work: the first movement of Spring from The Four Seasons.",
        "Composer: Antonio Vivaldi (1678–1741), nicknamed the Red Priest because he was ordained and had red hair.",
        "The Four Seasons is a set of four violin concertos: Spring, Summer, Autumn and Winter.",
        "Published in 1725 as part of a larger collection titled The Contest Between Harmony and Invention.",
        "Each concerto was paired with a sonnet describing scenes the music depicts, making it an early famous example of programme music.",
      ],
    }],
  },
  "fastest-holst": {
    answer: "Gustav Holst",
    acceptable: ["Gustav Holst", "Holst"],
    facts: ["Piece: Mars from The Planets."],
    misconception: "Frequently mistaken for Star Wars because of its influence.",
    media: "Local clip starts at 1:05 where the martial theme is strong and recognisable.",
    research: [{
      title: "Why it sounds like film music",
      items: [
        "Work: Mars, the Bringer of War, from Gustav Holst’s orchestral suite The Planets.",
        "Composer: Gustav Holst (1874–1934), an English composer.",
        "Written in 1914, before the full scale of the First World War was understood; the complete suite was first publicly performed in 1920.",
        "Its relentless rhythm is in 5/4 time, giving the march an unsettled, mechanical drive.",
        "It is not John Williams or Star Wars. The resemblance comes partly because later film composers inherited the orchestral language Holst helped popularise.",
        "The suite is astrological rather than astronomical: each planet portrays a character associated with astrology.",
      ],
    }],
  },
  "closest-elephant": { answer: "660 days", facts: ["About 22 months — the longest gestation of any living land mammal.", "A newborn African elephant commonly weighs roughly 90–120 kg."] },
  "closest-iceland": { answer: "Approximately 400,000", scoring: "Treat the supplied target as 400,000; this is intentionally rounded because population changes.", facts: ["Iceland passed 400,000 residents in the mid-2020s.", "Roughly two-thirds of the population lives in the Greater Reykjavík area."] },
  "closest-australian-flag": { answer: "6", facts: ["There are five stars in the Southern Cross plus the Commonwealth Star beneath the Union Flag.", "The Commonwealth Star has seven points: six for the states and one collectively for the territories."] },
  "closest-london-eye": { answer: "32", facts: ["The 32 capsules represent London’s 32 boroughs.", "They are numbered 1–12 and 14–33, so capsule number 13 is omitted even though all 32 exist.", "The wheel usually moves slowly enough for passengers to board without it stopping."] },
  "closest-piano": { answer: "88", facts: ["A standard modern piano has 52 white and 36 black keys.", "Its usual range is just over seven octaves, from A0 to C8.", "Earlier pianos often had fewer keys; some modern concert instruments extend beyond 88."] },
  "closest-rubiks": { answer: "54", facts: ["Nine coloured facelets appear on each of six faces: 6 × 9 = 54.", "Only 48 facelets move relative to the fixed centres.", "The visible colours are stickers or tiles; the cube itself has 26 externally visible small cubies, not 54 little cubes."] },
  "closest-monopoly": { answer: "40", facts: ["The standard board has 40 spaces: 22 properties, 4 railroads, 2 utilities and 12 other spaces.", "GO, Jail/Just Visiting, Free Parking and Go to Jail occupy the four corners."] },
  "closest-tennis-ball": { answer: "2", facts: ["A tennis ball is made from two shaped felt panels joined together.", "The joined edges create two curved seams that together form the familiar continuous dumbbell-shaped path."] },
  "closest-wine-bottle": { answer: "750 ml", facts: ["A standard bottle contains 750 millilitres, usually treated as about five 150 ml glasses.", "A magnum is 1.5 litres — exactly two standard bottles."] },
  "closest-dice-dots": { answer: "42", facts: ["Each die totals 21 pips."] },
  "closest-scrabble": { answer: "100 tiles", facts: ["The English-language set includes two blank tiles."] },
  "closest-adult-bones": { answer: "206", facts: ["Babies begin with more bones; several fuse during growth."] },
  "closest-olympic-pool": { answer: "50 metres", facts: ["Olympic long-course pools are 50 m long and 25 m wide, with ten lanes even though the central eight are traditionally used for racing.", "A short-course competition pool is 25 m long."] },
  "closest-week-minutes": { answer: "10,080", facts: ["7 × 24 × 60."] },
  "closest-playing-cards": { answer: "52", facts: ["The standard pack has 13 ranks in each of four suits.", "Jokers are extras and are not part of the core 52-card pack."] },
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
