export const standardHandler = {
	get: async (context) => {
		const { config, query } = context;

		const url = query.id
			? `${config.baseURL}/${query.type}/${query.id}`
			: `${config.baseURL}/${query.type}`;

		return fetch(url);
	},

	create: async (resource, { config }) => {
		const url = `${config.baseURL}/${resource.type}`;

		return fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(resource),
		});
	},

	update: async (resource, { config }) => {
		const url = `${config.baseURL}/${resource.type}/${resource.id}`;

		return fetch(url, {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(resource),
		});
	},

	delete: async (resource, { config }) => {
		const url = `${config.baseURL}/${resource.type}/${resource.id}`;

		return fetch(url, {
			method: "DELETE",
		});
	},
};
