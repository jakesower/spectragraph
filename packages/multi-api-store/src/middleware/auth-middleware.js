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
					queryParams: [...ctx.request.queryParams, { [param]: getToken() }],
				},
			});
	},
};
