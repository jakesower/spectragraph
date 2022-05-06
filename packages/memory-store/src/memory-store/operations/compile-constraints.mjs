import { compileArg, compileExpression, isExpression } from "./compile-expression.mjs";
import { constraintDefinitions } from "./constraints/constraint-definitions.mjs";

export function compileConstraints(query) {
  if (!query.constraints) return (x) => x;

  // 3 possibilities: expression, field w/constant field w/expression
  const { constraints } = query;
  const constraintFilters = Object.entries(constraints).map(
    ([constraintKey, constraintVal]) => (
      constraintDefinitions[constraintKey]
        ? compileExpression(constraintKey, constraintVal)
        : isExpression(constraintVal)
          ? (resource) => compileArg(constraintVal)(resource, constraintKey)
          : (resource) => resource[constraintKey] === constraintVal
    ),
  );

  const filterFn = (res) => constraintFilters.every((filter) => filter(res));
  return (resources) => resources.filter(filterFn);
}
