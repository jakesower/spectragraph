import { mapObj } from "@polygraph/utils";
import {
  ExpandedSchema, ResourceOfType, ResourceValidation, ResourceValidationError, Schema,
} from "../types";

const withResourceInfo = (validationDef, validationName) => ({
  ...validationDef,
  validate: (res, oldRes, options) => validationDef
    .validate(res, oldRes, options)
    .map((error) => ({
      ...error,
      type: res.type ?? oldRes.type,
      id: res.id ?? oldRes.id,
      validationName,
      validationType: "resource",
    })),
});

const propertyTypeChecks = {
  boolean: (val) => val === true || val === false,
  number: (val) => !Number.isNaN(val) && Number.isFinite(val),
  string: (val) => (typeof val === "string"),
};

type ResourceValidationDef = Omit<ResourceValidation, "validate"> & {
  validate: <S extends Schema, ResType extends keyof S["resources"]>(
    newResource: ResourceOfType<S, ResType>,
    oldResource: ResourceOfType<S, ResType>,
    options: {
      schema: ExpandedSchema<S>,
    },
  ) => Omit<ResourceValidationError<S>, "id" | "type">[];
}

export const resourceValidationDefs: Record<string, ResourceValidationDef> = {
  propertyTypes: {
    validate: (res, _, { schema }) => {
      const propDefs = Object.entries(schema.resources[res.type].properties);
      return propDefs
        .filter(([name, { optional }]) => !(optional && res.properties[name] === undefined))
        .filter(([name, { type }]) => !propertyTypeChecks[type](res.properties[name]))
        .map(([badPropName]) => ({
          message: `"${res.properties[badPropName]}" is not a valid value for "${badPropName}"`,
        }));
    },
  },
};

export const resourceValidations: Record<string, ResourceValidation> = mapObj(
  resourceValidationDefs,
  withResourceInfo,
);
