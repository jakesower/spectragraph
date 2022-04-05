export const $gt = {
  apply: ({ arg, value }) => value > arg,
  args: [{ type: "number" }],
};

export const $gte = {
  apply: ({ arg, value }) => value >= arg,
  args: [{ type: "number" }],
};

// optimize this
export const $in = {
  apply: ({ arg, field, resource }) => arg.includes(resource[field]),
  args: [{ type: "array" }],
};

export const $lt = {
  apply: ({ arg, value }) => value < arg,
  args: [{ type: "number" }],
};

export const $lte = {
  apply: ({ arg, value }) => value <= arg,
  args: [{ type: "number" }],
};
