export async function firstOperation(constraints, next, { query }) {
  if (!query.first) return next(constraints);

  const resources = await next([...constraints, { limit: 1, offset: 0 }]);
  return resources[0];
}
