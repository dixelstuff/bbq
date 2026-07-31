export function shuffleDefinitionOptions(options, seed) {
  const shuffled = [...options];
  const random = seededRandom(seed);
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled;
}

export function createSimulatedDefinitionVotes(players, options, seed) {
  return Object.fromEntries(
    players
      .filter((player) => player.simulated && player.connected)
      .map((player, index) => {
        const available = options.filter(
          (option) => option.authorId !== player.id,
        );
        if (!available.length) return undefined;
        const shuffled = shuffleDefinitionOptions(
          available,
          `${seed}:${player.id}:${index}`,
        );
        return [player.id, shuffled[0].id];
      })
      .filter(Boolean),
  );
}

function seededRandom(seed) {
  let state = hashSeed(String(seed ?? Date.now())) || 0x9e3779b9;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

function hashSeed(value) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
