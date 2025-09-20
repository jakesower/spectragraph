/**
 * @typedef {Object} MonitorHook
 * @property {(result: any, context: any, info: MonitorInfo) => boolean} test - Function to test if hook should execute
 * @property {(result: any, context: any, info: MonitorInfo) => void} action - Function to execute when test passes
 */

/**
 * @typedef {Object} MonitorInfo
 * @property {number} duration - Request duration in milliseconds
 * @property {boolean} cacheHit - Whether the result came from cache
 * @property {Error} [error] - Error that occurred during request (if any)
 */

/**
 * @typedef {Object} SimpleConfig
 * @property {Pick<Console, 'log' | 'error'>} [logger] - Logger instance to use
 * @property {boolean} [includeTiming] - Whether to include timing information in logs
 */

/**
 * @typedef {Object} MonitorConfig
 * @property {MonitorHook[]} [hooks] - Array of hook objects with test/action pairs
 * @property {(testError: Error, hook: MonitorHook) => any} [onError] - Error handling for hooks; throws if not specified
 */

/**
 * Logging middleware collection for request/response logging and timing.
 *
 * @type {Object}
 * @property {(config?: MonitorConfig) => Function} monitor - Creates monitoring middleware with configurable hooks
 * @property {(config?: SimpleConfig) => Function} simple - Creates middleware for logging request/response information
 */
export const log = {
	monitor(config = {}) {
		const { hooks = [], onError } = config;

		return async (ctx, next) => {
			const start = Date.now();
			let error, result;

			try {
				result = await next(ctx);
			} catch (err) {
				error = err;
				throw err;
			} finally {
				const info = {
					duration: Date.now() - start,
					cacheHit: result?.meta?.cacheHit ?? false,
					...(error && { error }),
				};

				hooks.forEach((hook) => {
					try {
						if (hook.test(result, ctx, info)) {
							hook.action(result, ctx, info);
						}
					} catch (actionError) {
						if (onError) {
							onError(actionError, hook);
						} else {
							throw actionError;
						}
					}
				});
			}

			return result;
		};
	},

	simple(config = {}) {
		const { logger = console } = config;

		return async (ctx, next) => {
			const start = Date.now();
			logger.log(`→ ${ctx.query.type} request started`);

			try {
				const result = await next(ctx);
				const duration = Date.now() - start;
				logger.log(`✓ ${ctx.query.type} completed (${duration}ms)`);
				return result;
			} catch (error) {
				const duration = Date.now() - start;
				logger.error(`✗ ${ctx.query.type} failed (${duration}ms): ${error.message}`);
				throw error;
			}
		};
	},
};
