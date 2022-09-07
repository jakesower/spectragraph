export const castPropToDb = (schema, resType, propKey, val) =>
  schema.resources[resType].properties[propKey].type === "boolean"
    ? val === true
      ? 1
      : val === false
        ? 0
        : undefined
    : val;

export const castValToDb = (val) => (val === true ? 1 : val === false ? 0 : val);
