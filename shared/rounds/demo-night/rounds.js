import { mediaVisibility, roundTypes, scoringStrategies } from "../../round-types.js";

const titleMedia = (id) => ({
  title: { id, type: "image", visibility: mediaVisibility.display },
});

const answerRound = ({
  id,
  section,
  type,
  typeLabel,
  question,
  answer,
  acceptedAnswers,
  choices,
  mediaId,
  scoring,
  correctValue,
  prompt,
}) => ({
  id,
  section,
  type,
  typeLabel,
  title: question,
  question,
  answer,
  acceptedAnswers,
  choices,
  correctValue,
  prompt,
  submission: {
    kind: type === roundTypes.closestWins ? "number" : choices ? "choice" : "text",
    expectsEveryConnectedPlayer: true,
    autoCloseWhenComplete: false,
  },
  scoring,
  media: titleMedia(mediaId),
});

const exactScoring = {
  strategy: scoringStrategies.exactAnswer,
  correctPoints: 1,
};

export const mcqRounds = [
  {
    id: "mcq-time-zones",
    question: "Which country has the most time zones?",
    choices: ["Russia", "USA", "France", "Australia"],
    answer: "France",
  },
  {
    id: "mcq-fingerprints",
    question: "Which animal has fingerprints almost identical to humans?",
    choices: ["Gorilla", "Orangutan", "Koala", "Chimpanzee"],
    answer: "Koala",
  },
  {
    id: "mcq-powered-flight",
    question: "What is the only mammal capable of true powered flight?",
    answer: "Bat",
    acceptedAnswers: ["bat", "bats"],
  },
  {
    id: "mcq-octopus-hearts",
    question: "How many hearts does an octopus have?",
    answer: "3",
    acceptedAnswers: ["3", "three"],
  },
  {
    id: "mcq-oldest-university",
    question:
      "Which university is generally recognised as the oldest continuously operating university?",
    answer: "University of Bologna",
    acceptedAnswers: ["university of bologna", "bologna"],
  },
  {
    id: "mcq-shortest-day",
    question: "Which planet has the shortest day?",
    answer: "Jupiter",
  },
  {
    id: "mcq-least-letter",
    question: "Which letter appears least frequently in English?",
    answer: "Q",
  },
  {
    id: "mcq-chess-squares",
    question: "How many total squares are there on a chessboard?",
    answer: "204",
  },
].map((round) =>
  answerRound({
    ...round,
    section: "BBQ-MCQ",
    type: roundTypes.mcq,
    typeLabel: "BBQ-MCQ",
    mediaId: "demo-mcq-title",
    scoring: exactScoring,
  }),
);

export const fastestFreeTextRounds = [
  {
    id: "fastest-shakespeare",
    question: "Name any Shakespeare play.",
    answer: "Any genuine Shakespeare play",
    acceptedAnswers: ["manual"],
  },
  {
    id: "fastest-italian-island",
    question: "Which Italian island is the largest?",
    answer: "Sicily",
  },
  {
    id: "fastest-australian-coastline",
    question: "Which Australian state has the longest coastline?",
    answer: "Western Australia",
    acceptedAnswers: ["western australia", "wa"],
  },
  {
    id: "fastest-jupiter-moon",
    question: "Name any moon of Jupiter.",
    answer: "Any genuine moon of Jupiter",
    acceptedAnswers: ["manual"],
  },
  {
    id: "fastest-beethoven",
    question: "Which composer wrote this?",
    answer: "Beethoven",
    prompt: "Audio placeholder — Symphony No. 5",
  },
  {
    id: "fastest-strauss",
    question: "Which composer wrote this?",
    answer: "Richard Strauss",
    prompt: "Audio placeholder — Also sprach Zarathustra",
  },
  {
    id: "fastest-vivaldi",
    question: "Which composer wrote this?",
    answer: "Antonio Vivaldi",
    acceptedAnswers: ["antonio vivaldi", "vivaldi"],
    prompt: "Audio placeholder — Spring from The Four Seasons",
  },
  {
    id: "fastest-holst",
    question: "Which composer wrote this?",
    answer: "Gustav Holst",
    acceptedAnswers: ["gustav holst", "holst"],
    prompt: "Audio placeholder — Mars from The Planets",
  },
].map((round) =>
  answerRound({
    ...round,
    section: "FASTEST FREE TEXT",
    type: roundTypes.fastestFreeText,
    typeLabel: "FASTEST FREE TEXT",
    mediaId: "demo-fastest-title",
    scoring: {
      strategy: scoringStrategies.fastestCorrect,
      firstCorrectPoints: 2,
      otherCorrectPoints: 1,
    },
  }),
);

export const bestFreeTextRounds = [
  ["best-vegemite", "Rename Vegemite."],
  [
    "best-prime-minister",
    "Belinda unexpectedly becomes Prime Minister. What is her first law?",
  ],
  ["best-olympic-event", "Invent the worst Olympic event."],
  ["best-superhero", "Give Belinda a superhero name."],
  [
    "best-autobiography",
    "What is the title of Belinda's autobiography?",
  ],
  ["best-public-holiday", "Invent a new Australian public holiday."],
].map(([id, question]) =>
  answerRound({
    id,
    section: "BEST FREE TEXT",
    type: roundTypes.bestFreeText,
    typeLabel: "BEST FREE TEXT",
    question,
    answer: "Host's choice",
    mediaId: "demo-best-title",
    scoring: { strategy: scoringStrategies.manual },
  }),
);

export const definitionRounds = [
  "Callipygian",
  "Crapulence",
  "Lalochezia",
  "Quockerwodger",
  "Uhtceare",
  "Clinomania",
].map((word) => ({
  id: `definition-${word.toLowerCase()}`,
  section: "MY DEFINITION",
  type: roundTypes.myDefinition,
  typeLabel: "MY DEFINITION",
  title: word,
  question: `Invent a convincing definition for ${word}.`,
  word,
  submission: {
    kind: "text",
    expectsEveryConnectedPlayer: true,
    autoCloseWhenComplete: false,
  },
  scoring: {
    strategy: scoringStrategies.definitionBluff,
    correctDefinitionPoints: 2,
    fooledPlayerPoints: 1,
  },
  media: titleMedia("demo-definition-title"),
}));

const closestItems = [
  ["closest-elephant", "How many days is an elephant pregnant?", 660, "660"],
  ["closest-iceland", "What is the population of Iceland?", 400000, "Approximately 400,000"],
  ["closest-australian-flag", "How many stars are on the Australian flag?", 6, "6"],
  ["closest-london-eye", "How many passenger capsules does the London Eye have?", 32, "32"],
  ["closest-piano", "How many keys does a piano have?", 88, "88"],
  ["closest-rubiks", "How many coloured squares are on a Rubik's Cube?", 54, "54"],
  ["closest-monopoly", "How many spaces are around a Monopoly board?", 40, "40"],
  ["closest-tennis-ball", "How many curved seams are on a tennis ball?", 2, "2"],
  ["closest-wine-bottle", "How many millilitres are in a standard wine bottle?", 750, "750"],
  ["closest-dice-dots", "How many dots are on a standard pair of dice in total?", 42, "42"],
  ["closest-scrabble", "How many letter tiles are in an English-language Scrabble set?", 100, "100"],
  ["closest-adult-bones", "How many bones are in the adult human body?", 206, "206"],
  ["closest-olympic-pool", "How many metres long is an Olympic swimming pool?", 50, "50"],
  ["closest-week-minutes", "How many minutes are there in one week?", 10080, "10,080"],
  ["closest-playing-cards", "How many cards are in a standard deck without jokers?", 52, "52"],
  ["closest-golf-ball", "Approximately how many dimples are on a typical golf ball?", 336, "Approximately 336"],
];

export const closestWinsRounds = closestItems.map(
  ([id, question, correctValue, answer]) =>
    answerRound({
      id,
      section: "CLOSEST WINS",
      type: roundTypes.closestWins,
      typeLabel: "CLOSEST WINS",
      question,
      answer,
      correctValue,
      prompt: "Submit a number",
      mediaId: "demo-closest-title",
      scoring: {
        strategy: scoringStrategies.closestTwoOne,
        closestPoints: 2,
        secondPoints: 1,
      },
    }),
);

export const demoNightRounds = [
  ...mcqRounds,
  ...fastestFreeTextRounds,
  ...bestFreeTextRounds,
  ...definitionRounds,
  ...closestWinsRounds,
];
