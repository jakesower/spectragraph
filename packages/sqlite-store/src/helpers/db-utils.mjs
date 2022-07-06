export function castFromDb(schema, resType, props, db) {
  const castProp = (val, prop) =>
    relResDef.properties[prop].type === "boolean"
      ? val === 0
        ? false
        : val === 1
          ? true
          : undefined
      : val === null
        ? undefined
        : val;
}
