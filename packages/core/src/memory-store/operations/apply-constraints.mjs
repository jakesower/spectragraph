export function applyConstraints(resources, next, { query }) {
  if (!query.constraints) return next(resources);

  const { constraints } = query;
  const constraintFilters = Object.entries(constraints).map(
    ([prop, reqVal]) => (resource) => resource[prop] === reqVal,
  );

  return next(resources.filter(
    (res) => constraintFilters.every((filter) => filter(res)),
  ));
}
