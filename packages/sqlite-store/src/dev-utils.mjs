import { format } from "sql-formatter";
import chalk from "chalk";

export function logSql(sql, params) {
  console.log(chalk.blue.bold(`\n${format(sql, { params })}`).replace(/ \$/g, "$"));
  console.log("params", `[ ${chalk.blue(params.join(", "))} ]\n`);
}
