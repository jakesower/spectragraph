import test from "ava";
import { compileExpression } from "../src/expressions.mjs";

const operators = {
  $eq: {
    compile: (args, compile) => {
      const compiledArgs = args.map(compile);

      return (variables) => {
        const [left, right] = compiledArgs.map((compiledArg) => compiledArg(variables));
        return left === right;
      };
    },
  },
  $focusProp: {
    compile: ({ expression, prop }, compile) => {
      const compiledSubExpr = compile(expression);
      return (variables) => compiledSubExpr(variables[prop]);
    },
  },
  $id: {
    compile: () => (x) => x,
  },
  $literal: {
    compile: (args) => () => args,
  },
};

test("an equality expression can be compiled and run", (t) => {
  const compiled = compileExpression({ $eq: [3, 3] }, operators);
  const result = compiled();

  t.is(result, true);
});

test("$literal expression", (t) => {
  const compiled = compileExpression({ $literal: [3, 4] }, operators);
  const result = compiled();

  t.deepEqual(result, [3, 4]);
});

test("$focusProp expression", (t) => {
  const compiled = compileExpression(
    { $focusProp: { prop: "foo", expression: { $id: null } } },
    operators,
  );
  const result = compiled({ foo: 4, bar: 5 });

  t.deepEqual(result, 4);
});

test("an object that looks like an expression is an error", (t) => {
  t.throws(() => {
    compileExpression(
      { $notAnOperator: { prop: "foo", expression: { $id: null } } },
      operators,
    );
  });
});
