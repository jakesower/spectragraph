import { mapObj } from "@polygraph/utils/objects";
import { SQL_CLAUSE_CONFIG } from "./constants/sql-clause-config.mjs";

export function composeClauses(queryModifiers) {
  return queryModifiers.reduce(
    (acc, condObj) => ({
      ...acc,
      ...mapObj(condObj, (condVal, clauseKey) =>
        SQL_CLAUSE_CONFIG[clauseKey].compose(acc[clauseKey], condVal),
      ),
    }),
    mapObj(SQL_CLAUSE_CONFIG, (clause) => clause.initVal),
  );
}
