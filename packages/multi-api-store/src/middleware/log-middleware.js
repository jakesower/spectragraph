export const log = {
	requests(config = {}) {
		const { logger = console, includeTiming = true } = config;

		return async (ctx, next) => {
			const start = Date.now();
			logger.log(`→ ${ctx.query.type} request started`);

			try {
				const result = await next(ctx);
				const duration = Date.now() - start;
				const timing = includeTiming ? ` (${duration}ms)` : "";
				logger.log(`✓ ${ctx.query.type} completed${timing}`);
				return result;
			} catch (error) {
				const duration = Date.now() - start;
				const timing = includeTiming ? ` (${duration}ms)` : "";
				logger.error(`✗ ${ctx.query.type} failed${timing}: ${error.message}`);
				throw error;
			}
		};
	},
};
