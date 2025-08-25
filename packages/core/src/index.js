export { validateSchema } from "./schema.js";
export { normalizeQuery, validateQuery } from "./query.js";
export {
	linkInverses,
	createEmptyGraph,
	createGraphFromResources,
	mergeGraphs,
	mergeGraphsDeep,
} from "./graph.js";
export { queryGraph } from "./graph/query-graph.js";
export {
	createValidator,
	createResource,
	mergeResources,
	normalizeResource,
	validateCreateResource,
	validateDeleteResource,
	validateQueryResult,
	validateMergeResource,
	validateUpdateResource,
} from "./resource.js";
export {
	createExpressionEngine,
	defaultExpressionEngine,
	defaultExpressions,
} from "./expressions/expressions.js";

import { ensure } from "./lib/helpers.js";
import { validateSchema } from "./schema.js";
import { validateQuery } from "./query.js";
import {
	validateCreateResource,
	validateDeleteResource,
	validateQueryResult,
	validateMergeResource,
	validateUpdateResource,
} from "./resource.js";

export const ensureValidSchema = ensure(validateSchema);
export const ensureValidQuery = ensure(validateQuery);
export const ensureValidCreateResource = ensure(validateCreateResource);
export const ensureValidUpdateResource = ensure(validateUpdateResource);
export const ensureValidDeleteResource = ensure(validateDeleteResource);
export const ensureValidMergeResource = ensure(validateMergeResource);
export const ensureValidQueryResult = ensure(validateQueryResult);
