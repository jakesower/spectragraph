export function makeRefKey(ref) {
  const { type, id } = ref;
  return JSON.stringify({ type, id });
}
