import { compileExpression } from "../compile-expression.mjs";

// TODO: compile these as well
export const $and = {
  args: [{ type: "number" }],
  compile: (definition) =>
    definition.arg.every((cond) => compileExpression(cond)(definition)),
};
