export const standardHandler = {
	get: async (context) => {
		const { config, query } = context;

		const url = query.id
			? `${config.baseURL}/${query.type}/${query.id}`
			: `${config.baseURL}/${query.type}`;

		const response = await fetch(url);

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		return response.json();
	},

	create: async (resource, { config }) => {
		const url = `${config.baseURL}/${resource.type}`;

		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(resource),
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		return response.json();
	},

	update: async (resource, { config }) => {
		const url = `${config.baseURL}/${resource.type}/${resource.id}`;

		const response = await fetch(url, {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(resource),
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		return response.json();
	},

	delete: async (resource, { config }) => {
		const url = `${config.baseURL}/${resource.type}/${resource.id}`;

		const response = await fetch(url, {
			method: "DELETE",
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		// Some APIs return empty response for DELETE, handle both cases
		const text = await response.text();
		return text ? JSON.parse(text) : resource;
	},
};
