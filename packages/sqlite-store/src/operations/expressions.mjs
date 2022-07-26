export const sqliteConstraintExpressions = {
  $and: {
    compile:
      (exprVal, { runExpression }) =>
        (runVal) => {
          const predicates = exprVal.map((expr) => runExpression(expr, runVal));

          return {
            where: [
              `(${predicates
                .map((pred) => pred.where)
                .filter(Boolean)
                .join(") AND (")})`,
            ],
            vars: predicates.flatMap((pred) => pred.vars ?? []),
          };
        },
  },
  $eq: {
    compile:
      (exprVal, { runExpression }) =>
        (runVal) => {
          const [left, right] = exprVal.map((expr) => runExpression(expr, runVal));

          return {
            where: [`${left?.where ?? "?"} = ${right?.where ?? "?"}`],
            vars: [...(left?.vars ?? [left]), ...(right?.vars ?? [right])],
          };
        },
  },
  $prop: {
    compile: (exprVal, { query, schema }) => {
      if (!(exprVal in schema.resources[query.type].properties)) {
        throw new Error("invalid property");
      }

      return () => ({
        where: exprVal,
        vars: [],
      });
    },
  },
};
