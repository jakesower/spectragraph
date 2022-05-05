import { sortByAll } from "@polygraph/utils";
import { ERRORS } from "../../strings.mjs";
import { PolygraphError } from "../../validations/errors.mjs";

const compareFns = {
  integer: (x, y) => x - y,
  number: (x, y) => x - y,
  string: (x, y) => x.localeCompare(y),
};

export function order(resources, { orderingFunctions, query, schema }) {
  if (!query.order) return resources;

  if (!Array.isArray(resources)) {
    throw new PolygraphError(ERRORS.ORDER_NOT_ALLOWED_ON_SINGULAR, resources);
  }

  const orderFns = query.order.map((orderConfig) => {
    const { direction, function: fn, property } = orderConfig;

    const fnFromConfig = fn
      ? orderingFunctions[fn]
      : compareFns[schema.resources[query.type].properties[property].type];

    const fnWithProperty = property
      ? (left, right) => fnFromConfig(left[property], right[property])
      : fnFromConfig;

    return direction === "asc"
      ? fnWithProperty
      : (left, right) => fnWithProperty(right, left);
  });

  return sortByAll(resources, orderFns);
}
