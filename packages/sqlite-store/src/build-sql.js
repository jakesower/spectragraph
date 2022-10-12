import { SQL_CLAUSE_CONFIG } from "./constants/sql-clause-config.js";

export function buildSql(queryClauses) {
  return Object.entries(SQL_CLAUSE_CONFIG)
    .map(([clauseKey, clauseDef]) => clauseDef.toSql(queryClauses[clauseKey]))
    .filter(Boolean)
    .join("\n");
}
