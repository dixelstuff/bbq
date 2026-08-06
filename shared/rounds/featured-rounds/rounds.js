import {
  mediaVisibility,
  roundTypes,
  scoringStrategies,
} from "../../round-types.js";

const titleMedia = (id) => ({
  title: { id, type: "image", visibility: mediaVisibility.display },
});

const manualFreeText = ({
  id,
  section,
  question,
  answer,
  mediaId,
  acceptedAnswers,
  comedyReveal = false,
  prompt,
  genuineAnswer,
  maxPoints = 5,
  notes,
}) => ({
  id,
  section,
  type: roundTypes.bestFreeText,
  typeLabel: section,
  title: question,
  question,
  answer,
  acceptedAnswers,
  prompt,
  genuineAnswer,
  notes,
  participation: { mode: "individual" },
  submission: {
    kind: "text",
    expectsEveryConnectedPlayer: true,
    autoCloseWhenComplete: false,
  },
  scoring: { strategy: scoringStrategies.manual, maxPoints },
  flow: {
    reveal: {
      progressive: comedyReveal,
      genuineAnswerAfterSubmissions: comedyReveal,
      showGenuineAnswer: true,
    },
    scoring: { afterGenuineAnswer: comedyReveal },
  },
  media: titleMedia(mediaId),
});

const comedyRound = (definition) =>
  manualFreeText({ ...definition, comedyReveal: true });

export const csiKoonoomooRounds = [
  {
    id: "csi-big-strawberry",
    question:
      "“The strawberry itself was the most underwhelming thing I’ve ever seen. The decor in the restaurant is ______.”",
    answer: "an eyesore.",
  },
  {
    id: "csi-cactus-country",
    question:
      "“Went early because the day was a scorcher. Sombreros and parasols were provided for extra shade. We spent a couple of hours walking around and finished off with ______.”",
    answer: "tacos.",
  },
  {
    id: "csi-tocumwal-blowhole",
    question:
      "“We had visited Tocumwal the year before and went in search of the blowhole but never found it. We decided to give it another go this year and, with a bit of luck, finally found it. We were particularly underwhelmed. It looks like ______.”",
    answer: "a big puddle in the middle of a paddock.",
  },
].map((round) =>
  comedyRound({
    ...round,
    section: "CSI KOONOOMOO",
    mediaId: "csi-koonoomoo-title",
    notes:
      "Reveal every player ending in your chosen order, reveal the genuine review last, then award 0–5 points for accuracy, closeness or comedy.",
  }),
);

export const sippingPointRounds = [
  manualFreeText({
    id: "sipping-pommery-brut",
    section: "SIPPING POINT",
    question:
      "Pommery is credited with pioneering what style of champagne that is now the standard?",
    answer: "Brut",
    acceptedAnswers: ["brut", "brut champagne"],
    mediaId: "sipping-point-title",
    notes: "Accept ‘brut champagne’ or an unmistakably equivalent answer.",
  }),
  manualFreeText({
    id: "sipping-japanese-slipper",
    section: "SIPPING POINT",
    question:
      "Despite its name, in what city was the Japanese Slipper cocktail invented?",
    answer: "Melbourne",
    mediaId: "sipping-point-title",
  }),
  {
    id: "sipping-moccona",
    section: "SIPPING POINT",
    type: roundTypes.mcq,
    typeLabel: "SIPPING POINT",
    title: "Which of these was an actual line from a 1990s Moccona ad?",
    question: "Which of these was an actual line from a 1990s Moccona ad?",
    choices: [
      "Come home for a Moccona.",
      "I have Moccona at my place.",
      "Moccona keeps you going all night.",
      "Losing steam? Make it Moccona.",
    ],
    answer: "I have Moccona at my place.",
    acceptedAnswers: ["I have Moccona at my place."],
    participation: { mode: "individual" },
    submission: {
      kind: "choice",
      expectsEveryConnectedPlayer: true,
      autoCloseWhenComplete: false,
    },
    scoring: {
      strategy: scoringStrategies.exactAnswer,
      firstCorrectPoints: 2,
      otherCorrectPoints: 1,
    },
    notes: "Option B is the genuine 1990s advertising line.",
    media: titleMedia("sipping-point-title"),
  },
];

export const googlebelRounds = [
  {
    id: "googlebel-the-oc",
    question:
      "Seth Cohen: “I had sex with a girl! Summer, to be more specific… I sucked so bad. I was like a fish flopping around on dry land. Ryan, I was Nemo and ______.”",
    answer: "I just wanted to go home.",
    notes:
      "Setup: Seth Cohen is describing his disastrous first sexual experience with Summer.",
  },
  {
    id: "googlebel-game-of-thrones",
    question: "Tyrion replies to Varys: “Because ______.”",
    answer: "I have balls, and you don’t.",
    notes:
      "Setup: Varys asks Tyrion why he takes offence at dwarf jokes but enjoys making jokes about eunuchs.",
  },
  {
    id: "googlebel-fleabag",
    question: "Fleabag at a silent Quaker meeting: “It’s very, very ______.”",
    answer: "erotic.",
    notes:
      "Setup: Fleabag describes the meeting directly to the audience as intense and very quiet, then adds the missing word.",
  },
].map((round) =>
  comedyRound({
    ...round,
    section: "GOOGLEBEL",
    mediaId: "googlebel-title",
    notes: `${round.notes} Reveal every player ending first, reveal the genuine quote last, then award 0–5 points for closeness or comedy.`,
  }),
);

export const thankGodYoureLyricsRounds = [
  {
    id: "lyrics-teenage-dirtbag",
    question: "Her name is Noelle\nI have a dream about her\nShe rings my bell",
    answer: "I got gym class in half an hour",
    song: "Teenage Dirtbag",
    artist: "Wheatus",
  },
  {
    id: "lyrics-torn",
    question:
      "So I guess the fortune teller's right\nShould have seen just what was there",
    answer: "and not some holy light",
    song: "Torn",
    artist: "Natalie Imbruglia",
  },
  {
    id: "lyrics-no-aphrodisiac",
    question:
      "Truth, youth, beauty, fame, boredom, red hair, no hair\n[ THREE WORD GAP ]\nand a picture of you",
    answer: "Innocence, awkwardness, impunity",
    song: "No Aphrodisiac",
    artist: "The Whitlams",
    instruction: "MISSING 3 WORDS + SONG + ARTIST",
  },
  {
    id: "lyrics-gangstas-paradise",
    question: "Fool, I'm the kinda G the little homies wanna be like",
    answer:
      "On my knees in the night, sayin' prayers in the streetlight",
    song: "Gangsta’s Paradise",
    artist: "Coolio",
  },
].map((round) =>
  comedyRound({
    id: round.id,
    section: "THANK GOD YOU’RE LYRICS",
    question: round.question,
    answer: round.answer,
    prompt: round.instruction ?? "NEXT LYRIC + SONG + ARTIST",
    genuineAnswer: {
      song: round.song,
      artist: round.artist,
    },
    maxPoints: 3,
    mediaId: "thank-god-youre-lyrics-title",
    notes: `Song: ${round.song}. Artist: ${round.artist}. Award 0–3 points total: up to 2 for the lyric and 1 for artist/song. Judge everything manually.`,
  }),
);

export const featuredRounds = [
  ...csiKoonoomooRounds,
  ...sippingPointRounds,
  ...googlebelRounds,
  ...thankGodYoureLyricsRounds,
];
