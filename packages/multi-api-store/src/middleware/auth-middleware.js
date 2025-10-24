/**
 * Authentication middleware collection for adding auth headers and query parameters.
 *
 * @type {Object}
 * @property {Function} bearerToken - Creates middleware for Bearer token authentication
 * @property {Function} queryParam - Creates middleware for query parameter authentication
 */
export const auth = {
	bearerToken(getToken) {
		return (ctx, next) =>
			next({
				...ctx,
				request: {
					...ctx.request,
					headers: {
						...ctx.request.headers,
						Authorization: `Bearer ${getToken()}`,
					},
				},
			});
	},

	queryParam(getToken, param = "token") {
		return (ctx, next) =>
			next({
				...ctx,
				request: {
					...ctx.request,
					queryParams: { ...ctx.request.queryParams, [param]: getToken() },
				},
			});
	},
};
