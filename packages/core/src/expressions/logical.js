export const $and = {
  compile:
    (exprVal, { runExpression }) =>
      (runVal) =>
        exprVal.every((criterion) => runExpression(criterion, runVal)),
};
