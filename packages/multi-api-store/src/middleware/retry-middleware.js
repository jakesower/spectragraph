const defaultBackoffFn = (attempt) =>
	Math.min(1000 * Math.pow(2, attempt) * (0.75 + Math.random() * 0.5), 30000);

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
				const makeAttempt = async (attempt) => {
					try {
						let timedOut = false;

						setTimeout(() => {
							timedOut = true;
							if (attempt > maxRetries) {
								const timeTaken = Math.floor((new Date() - startTime) / 1000);
								reject(`request timed out after ${timeTaken} second(s)`);
								return;
							}
							makeAttempt(attempt + 1);
						}, timeout);

						const result = await next(ctx);
						if (!timedOut) resolve(result);
					} catch (err) {
						const { status } = err?.cause?.response ?? {};
						if (attempt > maxRetries || !status || status < 500) {
							reject(err);
							return;
						}

						setTimeout(async () => {
							await makeAttempt(attempt + 1);
						}, backoffFn(attempt));
					}
				};

				makeAttempt(1);
			});
		};
	},
};
