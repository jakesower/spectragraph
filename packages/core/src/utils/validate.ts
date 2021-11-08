import {
  ExpandedSchema, ResourceOfType, ResourceValidationError, Schema,
} from "../types";
import { resourceValidations } from "../validations";

type ValidationResult<S extends Schema> = Promise<{
  isValid: boolean,
  errors: ResourceValidationError<S>[],
}>;

export async function validateResource<S extends Schema, ResType extends keyof S["resources"]>(
  schema: ExpandedSchema<S>,
  resource: ResourceOfType<S, ResType> & { type: ResType },
): ValidationResult<S> {
  const errors = Object.values(resourceValidations).flatMap(
    (validation) => validation.validate(resource, resource, { schema }) ?? [],
  );

  return { isValid: errors.length === 0, errors };
}
