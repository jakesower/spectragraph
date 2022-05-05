export function limit(resources, { query }) {
  if (!query.limit && !query.offset) return resources;

  const { limit: lim, offset = 0 } = query;
  return resources.slice(offset, lim && lim + offset);
}
