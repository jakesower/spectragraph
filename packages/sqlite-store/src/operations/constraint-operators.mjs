const comparative = (sqlOperator) => ({
  compile:
    (exprVal, { runExpression }) =>
      (runVal) => {
        const [left, right] = exprVal.map((expr) => runExpression(expr, runVal));

        return {
          where: [`${left?.where ?? "?"} ${sqlOperator} ${right?.where ?? "?"}`],
          vars: [...(left?.vars ?? [left]), ...(right?.vars ?? [right])],
        };
      },
});

export const sqliteConstraintOperators = {
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
  // comparative
  $eq: comparative("="),
  $gt: comparative(">"),
  $gte: comparative(">="),
  $lt: comparative("<"),
  $lte: comparative("<="),
  $ne: comparative("!="),
  $in: {
    compile:
      (args, { runExpression }) =>
        (vars) => {
          const [item, array] = args;
          const itemVal = runExpression(item, vars);
          const arrayVals = array.map((arg) => runExpression(arg, vars));

          if (array.length === 0) return {};

          return {
            where: `${itemVal.where} IN (${arrayVals.map(() => "?").join(", ")})`,
            vars: arrayVals,
          };
        },
  },
  $nin: {
    compile:
      (args, { runExpression }) =>
        (vars) => {
          const [item, array] = args;
          const itemVal = runExpression(item, vars);
          const arrayVals = array.map((arg) => runExpression(arg, vars));

          if (array.length === 0) return {};

          return {
            where: `${itemVal.where} NOT IN (${arrayVals.map(() => "?").join(", ")})`,
            vars: arrayVals,
          };
        },
  },
};
