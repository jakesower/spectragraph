import test from "ava";
import { compileExpression, coreExpressions } from "../src/expressions.js";

const kids = {
  xinema: { name: "Ximena", age: 4 },
  yousef: { name: "Yousef", age: 5 },
  zoe: { name: "Zoe", age: 6 },
};

test("an equality expression can be compiled and run", async (t) => {
  const compiled = compileExpression(coreExpressions, { $eq: [3, 3] });
  const result = compiled();

  t.is(result, true);
});

test("equality is determined deeply", async (t) => {
  const compiled = compileExpression(coreExpressions, {
    $eq: [
      [3, { chicken: "butt" }],
      [3, { chicken: "butt" }],
    ],
  });
  const result = compiled();

  t.is(result, true);
});

test("a false equality expression can be compiled and run", async (t) => {
  const compiled = compileExpression(coreExpressions, { $eq: [3, 6] });
  const result = compiled();

  t.is(result, false);
});

test("fields can be looked up", async (t) => {
  const compiled = compileExpression(coreExpressions, { $eq: [4, { $prop: "age" }] });

  t.is(compiled(kids.xinema), true);
  t.is(compiled(kids.yousef), false);
  t.is(compiled(kids.zoe), false);
});

test.todo("deep equals");

test("runs $gt expressions", async (t) => {
  const compiled = compileExpression(coreExpressions, { $gt: [{ $prop: "age" }, 5] });

  t.is(compiled(kids.xinema), false);
  t.is(compiled(kids.yousef), false);
  t.is(compiled(kids.zoe), true);
});

test("runs $gte expressions", async (t) => {
  const compiled = compileExpression(coreExpressions, { $gte: [{ $prop: "age" }, 5] });

  t.is(compiled(kids.xinema), false);
  t.is(compiled(kids.yousef), true);
  t.is(compiled(kids.zoe), true);
});

test("runs $lt expressions", async (t) => {
  const compiled = compileExpression(coreExpressions, { $lt: [{ $prop: "age" }, 5] });

  t.is(compiled(kids.xinema), true);
  t.is(compiled(kids.yousef), false);
  t.is(compiled(kids.zoe), false);
});

test("runs $lte expressions", async (t) => {
  const compiled = compileExpression(coreExpressions, { $lte: [{ $prop: "age" }, 5] });

  t.is(compiled(kids.xinema), true);
  t.is(compiled(kids.yousef), true);
  t.is(compiled(kids.zoe), false);
});

test("runs $ne expressions", async (t) => {
  const compiled = compileExpression(coreExpressions, { $ne: [{ $prop: "age" }, 5] });

  t.is(compiled(kids.xinema), true);
  t.is(compiled(kids.yousef), false);
  t.is(compiled(kids.zoe), true);
});

test("runs $in expressions", async (t) => {
  const compiled = compileExpression(coreExpressions, {
    $in: [{ $prop: "age" }, [4, 6]],
  });

  t.is(compiled(kids.xinema), true);
  t.is(compiled(kids.yousef), false);
  t.is(compiled(kids.zoe), true);
});

test("runs $nin expressions", async (t) => {
  const compiled = compileExpression(coreExpressions, {
    $nin: [{ $prop: "age" }, [4, 6]],
  });

  t.is(compiled(kids.xinema), false);
  t.is(compiled(kids.yousef), true);
  t.is(compiled(kids.zoe), false);
});
