import { mapObj } from "@polygraph/utils/objects";

const defaultClause = {
  compose: (acc, item) => [...(acc ?? []), ...(item ?? [])],
  initVal: [],
};

const clauses = {
  select: {
    ...defaultClause,
    toSql: (val) => `SELECT ${val.join(", ")}`,
  },
  from: {
    ...defaultClause,
    compose: (_, item) => item,
    initVal: null,
    toSql: (val) => `FROM ${val}`,
  },
  join: {
    ...defaultClause,
    toSql: (val) => val.join("\n"),
  },
  where: {
    ...defaultClause,
    toSql: (val) => (val.length > 0 ? `WHERE ${val.join("\nAND ")}` : ""),
  },
  vars: {
    ...defaultClause,
    toSql: () => "",
  },
  limit: {
    ...defaultClause,
    compose: (acc, item) => Math.min(acc, item),
    initVal: Infinity,
    toSql: (val) => (val < Infinity ? `LIMIT ${val}` : ""),
  },
  offset: {
    ...defaultClause,
    compose: (_, item) => item,
    initVal: 0,
    toSql: (val) => (val > 0 ? `OFFSET ${val}` : ""),
  },
};

export function composeClauses(queryModifiers) {
  return queryModifiers.reduce(
    (acc, condObj) => ({
      ...acc,
      ...mapObj(condObj, (condVal, clauseKey) =>
        clauses[clauseKey].compose(acc[clauseKey], condVal),
      ),
    }),
    mapObj(clauses, (clause) => clause.initVal),
  );
}
