import { getInverse } from "@blossom-js/core/schema";
import { groupBy } from "@blossom-js/utils";

const boolToNum = (val) => (val === true ? 1 : val === false ? 0 : val) ?? null;

export function createTables(schema, db) {
  Object.entries(schema.resources).map(async ([resType, resDef]) => {
    const cols = groupBy(Object.entries(resDef.properties), ([, propDef]) => {
      if (propDef.type !== "relationship") return "tableCols";
      if (propDef.store?.join?.localColumn) return "localJoinCols";

      const inverse = getInverse(schema, propDef);
      if (
        propDef?.store?.join?.joinColumn &&
        (resType <= propDef.relatedType || !inverse)
      ) {
        return "joinCols";
      }
      return "unneeded";
    });

    const { joinCols = [], localJoinCols = [], tableCols = [] } = cols;
    const idCol = "id VARCHAR";
    const createNonRelTableCols = tableCols.map(
      ([propName, propDef]) => `${propName} ${propDef.store.sqlType}`,
    );
    const createLocalJoinCols = localJoinCols.map(
      ([, propDef]) => `${propDef.store.join.localColumn} VARCHAR`,
    );

    // -- Create resource table
    const createTableCols = [idCol, ...createNonRelTableCols, ...createLocalJoinCols];
    const createTableSql = `CREATE TABLE ${resType} (${createTableCols.join(", ")})`;

    db.exec(createTableSql);

    joinCols.forEach(([, relDef]) => {
      const inverse = getInverse(schema, relDef);
      const { joinTable } = relDef.store.join;
      const localRelCol = relDef.store.join.joinColumn;
      const foreignRelCol = inverse
        ? inverse.store.join.joinColumn
        : relDef.store.join.foreignJoinColumn;
      const joinTableSql = `CREATE TABLE ${joinTable} (${localRelCol} VARCHAR, ${foreignRelCol} VARCHAR)`;

      return db.exec(joinTableSql);
    });
  });
}

export function seed(schema, db, seedData) {
  Object.entries(schema.resources).map(async ([resType, resDef]) => {
    const cols = groupBy(Object.entries(resDef.properties), ([, propDef]) => {
      if (propDef.type !== "relationship") return "tableCols";
      if (propDef.store?.join?.localColumn) return "localJoinCols";

      // TODO: allow for one-way to-many relationships
      if (propDef?.store?.join?.joinColumn && resType <= propDef.relatedType) {
        return "joinCols";
      }
      return "unneeded";
    });

    const { joinCols = [], localJoinCols = [], tableCols = [] } = cols;

    const tableColNames = ["id", ...tableCols.map(([colName]) => colName)];
    const tableLocalJoinColNames = localJoinCols.map(([colName]) => colName);

    const dataCols = Array([...tableColNames, ...tableLocalJoinColNames].length).fill(
      "?",
    );
    const dataQuery = db.prepare(
      `INSERT INTO ${resType} VALUES (${dataCols.join(", ")})`,
    );

    Object.values(seedData[resType]).forEach((res) => {
      const tableData = tableColNames.map((colName) => boolToNum(res[colName]));
      const localJoinData = tableLocalJoinColNames.map(
        (colName) => res[colName]?.id ?? null,
      );

      const data = [...tableData, ...localJoinData];
      dataQuery.run(data);

      joinCols.forEach(([relName, relDef]) => {
        const { joinTable } = relDef.store.join;
        const joinDataQuery = db.prepare(`INSERT INTO ${joinTable} VALUES (?, ?)`);

        res[relName].forEach((relRef) => {
          joinDataQuery.run([res.id, relRef.id]);
        });
      });
    });
  });
}
