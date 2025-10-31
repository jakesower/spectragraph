import { normalizeResource } from "./resource.js";

/**
 * Creates a store mutation operation that accepts both flat and normalized resource formats.
 *
 * Store mutations (create, update, upsert) can accept resources in two formats:
 * 1. Flat format: `operation(resourceType, flatResource)` - attributes and relationships at root
 * 2. Normalized format: `operation(normalResource)` - structured with type/id/attributes/relationships
 *
 * This function handles parameter validation, normalization, and execution for both formats.
 *
 * @param {import('./schema.js').Schema} schema - The schema defining resource types and relationships
 * @param {string} method - The method name (for error messages, e.g., "create", "update", "upsert")
 * @param {function(import('./resource.js').NormalResource): *} fn - The function to execute with the normalized resource
 * @returns {function(string, Object): *|function(Object): *} A function that accepts either format
 *
 * @example
 * // In a store implementation:
 * const create = storeMutation(schema, "create", (normalResource) => {
 *   ensureValidCreateResource(schema, normalResource, validator);
 *   return createAction(normalResource, context);
 * });
 *
 * // Users can then call with flat format:
 * store.create("bears", { name: "Grumpy", furColor: "blue", home: "home-123" });
 *
 * // Or normalized format:
 * store.create({
 *   type: "bears",
 *   attributes: { name: "Grumpy", furColor: "blue" },
 *   relationships: { home: { type: "homes", id: "home-123" } }
 * });
 */
export function storeMutation(schema, method, fn) {
	return (resourceTypeOrNormalResource, flatResource) => {
		if (
			!resourceTypeOrNormalResource ||
			(typeof resourceTypeOrNormalResource === "string" && !flatResource)
		) {
			throw new Error(
				`${method} must be of the form ${method}("resourceType", flatResource) or ${method}(normalResource)`,
			);
		}

		const normalResource =
			typeof resourceTypeOrNormalResource === "string"
				? normalizeResource(schema, resourceTypeOrNormalResource, flatResource)
				: resourceTypeOrNormalResource;

		return fn(normalResource);
	};
}
