export const typeValidations = {
  boolean: (val) => val === true || val === false,
  number: Number.isFinite,
  string: (val) => typeof val === "string" || val instanceof String,
};
