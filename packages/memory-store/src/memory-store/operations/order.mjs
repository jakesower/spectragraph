import { sortBy } from "@blossom/utils";
import { ERRORS } from "../../strings.mjs";
import { BlossomError } from "../../validations/errors.mjs";

const compareFns = {
  integer: (left, right) => left - right,
  number: (left, right) => left - right,
  string: (left, right) => left.localeCompare(right),
};

export function orderFunction({ orderingFunctions, query, schema }) {
  const { order, type: resType } = query;

  const fns = order.map((orderConfig) => {
    const { direction, function: fn, property } = orderConfig;

    const fnFromConfig = fn
      ? orderingFunctions[fn]
      : compareFns[schema.resources[resType].properties[property].type];

    const fnWithProperty = property
      ? (left, right) => fnFromConfig(left[property], right[property])
      : fnFromConfig;

    return direction === "asc"
      ? fnWithProperty
      : (left, right) => fnWithProperty(right, left);
  });

  return (left, right) => {
    for (let i = 0; i < fns.length; i += 1) {
      const v = fns[i](left, right);
      if (v !== 0) return v;
    }
    return 0;
  };
}

export function orderOperation(resources, { orderingFunctions, query, schema }) {
  if (!Array.isArray(resources)) {
    throw new BlossomError(ERRORS.ORDER_NOT_ALLOWED_ON_SINGULAR, resources);
  }

  return sortBy(resources, orderFunction({ orderingFunctions, query, schema }));
}
