export const charadesLibrary = {
  Movies: [
    "Titanic", "Jaws", "The Matrix", "Toy Story", "Finding Nemo", "The Lion King", "Home Alone", "The Godfather",
    "Jurassic Park", "Ghostbusters", "Rocky", "The Terminator", "Frozen", "Shrek", "Mission: Impossible", "Pirates of the Caribbean",
  ],
  "Famous People": [
    "Albert Einstein", "Taylor Swift", "Mr Bean", "Napoleon", "Indiana Jones", "Sherlock Holmes",
    "Elvis Presley", "Marilyn Monroe", "David Attenborough", "Charlie Chaplin", "Usain Bolt", "Steve Irwin", "Gordon Ramsay",
  ],
  Animals: [
    "Platypus", "Sloth", "Octopus", "Flamingo", "Penguin", "Peacock",
    "Kangaroo", "Giraffe", "Chameleon", "Crab", "Woodpecker", "Meerkat", "Walrus", "Fainting goat",
  ],
  Occupations: [
    "Hairdresser", "Dentist", "Magician", "Lifeguard", "Air traffic controller", "Auctioneer", "Mime artist",
    "Window cleaner", "Wedding photographer", "Dog groomer", "Traffic warden", "Pizza chef", "Opera singer", "Crane operator", "Weather presenter",
  ],
  "Awkward Situations": [
    "Walking through a spider web",
    "Trying to fold a fitted sheet",
    "Trying to plug in a USB the wrong way twice",
    "Stepping on Lego",
    "Parallel parking",
    "Untangling Christmas lights",
    "Opening a child-proof medicine bottle",
    "Getting the last toothpaste out of the tube",
    "Putting on fitted bedsheets",
    "Trying to catch a fly",
    "Realising you have waved back at someone who was not waving at you",
    "Carrying too many grocery bags in one trip",
    "Dropping your keys while your hands are full",
    "Trying not to sneeze during a quiet ceremony",
    "Discovering the public toilet has no paper",
    "Getting a shopping trolley with one terrible wheel",
    "Walking into a glass door",
    "Trying to take off a wet swimsuit",
    "Eating spaghetti on a first date",
    "Being trapped in a lift with someone you just argued with",
    "Trying to silently open a noisy snack packet",
    "Putting a doona into its cover",
    "Getting sunscreen in your eyes",
    "Trying to leave a group conversation but nobody notices",
    "Forgetting somebody's name while introducing them",
    "Trying to swat a mosquito in the dark",
  ],
  Actions: [
    "Building flat-pack furniture without instructions",
    "Walking a dog that is much stronger than you",
    "Chasing a hat down a windy street",
  ],
};

export const charadesPrompts = Object.entries(charadesLibrary).flatMap(
  ([category, prompts]) => prompts.map((prompt) => ({ category, prompt })),
);
