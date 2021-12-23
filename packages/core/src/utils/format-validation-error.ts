import { formatRef } from "./format-ref";
import { ResourceRefOfType, Schema, ValidationError } from "../types";

export function formatValidationError<S extends Schema>(error: ValidationError<S>): string {
  const { message, validationName, validationType } = error;

  if (validationType === "resource") {
    return `validation "${validationName}" failed: ${message} ${formatRef(error)}`;
  }

  return `validation "${validationName}" failed: ${message}`;
}
