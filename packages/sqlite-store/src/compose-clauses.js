import { mapObj } from "@taxonic/utils/objects";
import { SQL_CLAUSE_CONFIG } from "./constants/sql-clause-config.js";

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
