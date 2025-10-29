const defaultBackoffFn = (attempt) =>
	Math.min(1000 * Math.pow(2, attempt) * (0.75 + Math.random() * 0.5), 30000);

/**
 * Retry middleware collection for handling request failures with backoff strategies.
 *
 * @type {Object}
 * @property {Function} exponential - Creates middleware with exponential backoff retry logic
 */
export const retry = {
	exponential(config = {}) {
		const {
			maxRetries = 3,
			backoffFn = defaultBackoffFn,
			timeout = 30000,
		} = config;

		return (ctx, next) => {
			const startTime = new Date();

			return new Promise((resolve, reject) => {
				let timeoutId = null;
				let settled = false;

				const makeAttempt = async (attempt) => {
					// Check if we've already settled (resolved/rejected)
					if (settled) return;

					try {
						// Clear any existing timeout
						if (timeoutId) clearTimeout(timeoutId);

						// Set up timeout for this attempt
						timeoutId = setTimeout(() => {
							if (settled) return;

							if (attempt > maxRetries) {
								settled = true;
								const timeTaken = Math.floor((new Date() - startTime) / 1000);
								reject(`request timed out after ${timeTaken} second(s)`);
								return;
							}

							// Retry on timeout
							makeAttempt(attempt + 1);
						}, timeout);

						const result = await next(ctx);

						// Clear timeout and resolve if not already settled
						if (timeoutId) clearTimeout(timeoutId);
						if (!settled) {
							settled = true;
							resolve(result);
						}
					} catch (err) {
						// Clear timeout on error
						if (timeoutId) clearTimeout(timeoutId);

						// Check if already settled
						if (settled) return;

						const { status } = err?.cause?.response ?? {};
						if (attempt > maxRetries || !status || status < 500) {
							settled = true;
							reject(err);
							return;
						}

						// Retry after backoff
						setTimeout(() => {
							makeAttempt(attempt + 1);
						}, backoffFn(attempt));
					}
				};

				makeAttempt(1);
			});
		};
	},
};
