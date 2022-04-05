export const $gt = {
  apply: ({ arg, value }) => value > arg,
  args: [{ type: "number" }],
};

// optimize this
export const $in = {
  apply: ({ arg, field, resource }) => {
    console.log("made it to in", { arg, field, resource });
    return arg.includes(resource);
  },
  args: [{ type: "array" }],
};
