const taxonicToGraphqlTypes = ({ type, relatedType, cardinality }) =>
  type === "boolean"
    ? "Boolean"
    : type === "integer"
      ? "Int"
      : type === "number"
        ? "Float"
        : type === "string"
          ? "String"
          : type === "relationship"
            ? cardinality === "many"
              ? `[${relatedType}]`
              : relatedType
            : null;

export function makeGraphqlSchema(schema) {
  const resourceTypes = Object.entries(schema.resources).map(([resName, resDef]) => {
    const propTypes = Object.entries(resDef.properties).map(
      ([propName, propDef]) => `  ${propName}: ${taxonicToGraphqlTypes(propDef)}`,
    );

    return `type ${resName} {\n${propTypes.join("\n")}\n}`;
  });

  const topResources = Object.entries(schema.resources)
    .flatMap(([resName, resDef]) => [
      `${resName}: [${resName}]`,
      `${resName}ById(${resDef.idField ?? "id"}: String!): ${resName}`,
    ]);

  const queryType = `type Query {\n${topResources.join("\n\n")}\n}`;

  return `${resourceTypes.join("\n\n")}\n\n${queryType}`;
}
