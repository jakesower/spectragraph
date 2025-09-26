import {
	aggregation,
	createExpressionEngine,
	filtering,
	projection,
} from "json-expressions";

/**
 * @typedef {Object} SelectEngineConfig
 * @property {Array} [packs] - Additional expression packs to include beyond the default filtering, projection, and aggregation packs
 * @property {Object} [custom] - Custom expression definitions to add to the engine
 */

/**
 * Creates an expression engine for SELECT clauses with filtering, projection, and aggregation capabilities
 * @param {SelectEngineConfig} [config={}] - Configuration options for the engine
 * @returns {import('json-expressions').ExpressionEngine} Expression engine for SELECT operations
 */
export function createSelectEngine(config = {}) {
	const packs = [filtering, projection, aggregation, ...(config.packs ?? [])];
	const { custom } = config;

	return createExpressionEngine({ packs, custom });
}

/**
 * @typedef {Object} WhereEngineConfig
 * @property {Array} [packs] - Additional expression packs to include beyond the default filtering pack
 * @property {Object} [custom] - Custom expression definitions to add to the engine
 */

/**
 * Creates an expression engine for WHERE clauses with filtering capabilities only
 * @param {WhereEngineConfig} [config={}] - Configuration options for the engine
 * @returns {import('json-expressions').ExpressionEngine} Expression engine for WHERE operations
 */
export function createWhereEngine(config = {}) {
	const packs = [filtering, ...(config.packs ?? [])];
	const { custom } = config;

	return createExpressionEngine({ packs, custom });
}
