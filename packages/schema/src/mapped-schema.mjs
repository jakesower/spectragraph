/* eslint-disable no-param-reassign */

import Ajv from "ajv";
import { readFileSync } from "fs";
import yaml from "js-yaml";
import { PolygraphError } from "@polygraph/core";
import { mapObj } from "@polygraph/utils";
import { EACH, overEachPath } from "@polygraph/utils/lenses";
import { ERRORS } from "./strings.mjs";

const mappingSchema = yaml.load(
  readFileSync("./src/schemas/mapping.schema.yml").toString("utf-8"),
);
const schemaValidator = new Ajv().compile(mappingSchema);

/**
 * # Terminology and Abbreviations:
 *
 * ## Schema and Data Levels:
 * - resourceType: the type of the resource (keys on schema.resources)
 * - property: a property on a resource
 * - mapping: the full definition of mapping
 *
 * ## Schema Level Only:
 * - resourceSchema: the original schema to be mapped
 *
 * ## Data Level Only:
 * - resource: the resource to be modified
 */

const baseOperations = {
  $derive: {
    dataMutation: ({ arg, resource, functionDefinitions }) =>
      functionDefinitions[arg.functionName](resource),
    schemaMutation({ arg, functionDefinitions }) {
      if (!(arg.functionName in functionDefinitions)) {
        throw new PolygraphError(ERRORS.FUNCTION_NOT_DEFINED, {
          functionName: arg.functionName,
          availableFunctionNames: Object.keys(functionDefinitions),
        });
      }
      return arg.propertyDefinition;
    },
  },

  $translate: {
    dataMutation({ arg, resource }) {
      return resource[arg];
    },
    schemaMutation({ arg, resourceType, resourceSchema }) {
      return resourceSchema.resources[resourceType].properties[arg];
    },
  },
};

const deepEntries = (obj, depth) => {
  const out = [];
  const go = (curObj, curDepth, prev) => {
    if (curDepth > 0) {
      Object.entries(curObj).forEach(([k, v]) => go(v, curDepth - 1, [...prev, k]));
    } else {
      out.push([...prev, curObj]);
    }
  };

  go(obj, depth, []);
  return out;
};

// adaptationDefs are nested as resource -> property -> adaptation -> adaptation definition

export function MappedSchema(resourceSchema, mapping, options = {}) {
  if (!schemaValidator(mapping)) {
    throw new PolygraphError("invalid mapping", { errors: schemaValidator.errors });
  }

  const { functionDefinitions = {}, extraOperations = {} } = options;

  const operations = { ...baseOperations, ...extraOperations };
  const nextSchema = overEachPath(
    resourceSchema,
    ["resources", EACH, "properties"],
    () => ({}),
  );
  const transformResFns = mapObj(resourceSchema.resources, () => []);

  deepEntries(mapping, 3).forEach(([resourceType, property, opName, opArg]) => {
    const sharedArgs = {
      mapping,
      arg: opArg,
      functionDefinitions,
      property,
      resourceType,
    };

    const schemaResPropValue = operations[opName].schemaMutation({
      ...sharedArgs,
      resourceSchema,
    });

    nextSchema.resources[resourceType].properties[property] = schemaResPropValue;

    const mapFn = (resource, nextRes) => {
      const resPropValue = operations[opName].dataMutation({
        ...sharedArgs,
        resource,
      });

      nextRes[property] = resPropValue;
    };

    transformResFns[resourceType].push(mapFn);
  });

  const mapResource = (resourceType, resource) => {
    const nextRes = {};
    transformResFns[resourceType].forEach((fn) => fn(resource, nextRes));

    return nextRes;
  };

  return {
    schema: nextSchema,
    mapResource,
  };
}
