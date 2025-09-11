import { vi } from "vitest";
import {
	careBearData,
	runInterfaceTests,
} from "../../interface-tests/src/index.js";
import { createMultiApiStore } from "../src/multi-api-store.js";
import { mapValues } from "es-toolkit";

runInterfaceTests((schema) => {
	const getters = mapValues(schema.resources, (_, type) => {
		// Create a simple in-memory store for each resource type
		const store = new Map();

		// Pre-populate with careBearData
		Object.values(careBearData[type]).forEach((d) => {
			store.set(d.id, {
				...d.attributes,
				...d.relationships,
			});
		});

		return {
			get: vi.fn().mockImplementation((query) => {
				if (query.id) {
					// Single resource query by ID
					const resource = store.get(query.id);
					return Promise.resolve(resource ? [resource] : []);
				}
				// Return all resources for collection queries
				return Promise.resolve(Array.from(store.values()));
			}),
			create: vi.fn().mockImplementation((resource) => {
				const newResource = {
					id: resource.id ?? `new-${Date.now()}`,
					...resource.attributes,
					...resource.relationships,
				};
				store.set(newResource.id, newResource);
				return Promise.resolve(newResource);
			}),
			update: vi.fn().mockImplementation((resource) => {
				const existing = store.get(resource.id);
				if (!existing) {
					return Promise.reject(
						new Error(`Resource with id ${resource.id} not found`),
					);
				}
				const updated = {
					...existing,
					...resource.attributes,
					...resource.relationships,
				};
				store.set(resource.id, updated);
				return Promise.resolve(updated);
			}),
			delete: vi.fn().mockImplementation((resource) => {
				if (!store.has(resource.id)) {
					return Promise.reject(
						new Error(`Resource with id ${resource.id} not found`),
					);
				}
				store.delete(resource.id);
				return Promise.resolve({
					id: resource.id,
					type,
				});
			}),
		};
	});

	return createMultiApiStore(schema, { resources: getters });
});
