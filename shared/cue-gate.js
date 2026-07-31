export function createCueGate(limit = 500) {
  const played = new Set();
  return (key) => {
    if (!key || played.has(key)) return false;
    played.add(key);
    if (played.size > limit) played.delete(played.values().next().value);
    return true;
  };
}
