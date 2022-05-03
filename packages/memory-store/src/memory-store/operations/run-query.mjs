import { pipeWithContext } from "@polygraph/utils";
import { compileConstraints } from "./compile-constraints.mjs";
import { expandRelated } from "./expand-related.mjs"; // eslint-disable-line import/no-cycle
import { first } from "./first.mjs";
import { selectProperties } from "./select-properties.mjs";

export function runQuery(query, getFromStore, context) {
  const resourceOrResources = getFromStore(query);
  return processResults(resourceOrResources, getFromStore, context);
}

export function processResults(resourceOrResources, getFromStore, context) {
  if (resourceOrResources == null) return null;

  const { query } = context;

  const paramPipe = [
    compileConstraints(query),
    first,
    selectProperties,
    expandRelated(getFromStore),
  ];

  return pipeWithContext(paramPipe, context)(resourceOrResources);
}
