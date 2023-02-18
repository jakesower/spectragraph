import { mapValues, merge } from "lodash-es";
import { Query, Subquery, ensureValidQuery } from "./query.js";
import { LooseSchema, compileSchema } from "./schema.js";
import { evaluateId } from "./query.js";

type MemoryStoreOptions = {
	initialData: any;
};

export function MemoryStore(looseSchema: LooseSchema, options?: MemoryStoreOptions) {
	const schema = compileSchema(looseSchema);
	const data = mapValues(schema.resources, () => ({}));

	const seed = (seedData) => {
		merge(data, seedData); // mutates
	};

	const compileQuery = (rootQuery: Query) => {
		ensureValidQuery(schema, rootQuery);

		// create a function that takes in the various parts of a query and returns a
		// function that takes query arguments and returns the result
		return (args) => {
			const compileSubquery = (resType: string, subquery: Subquery) => {
				const resDef = schema.resources[resType];

				const getProperties = (res) => {
					const props = subquery.properties ?? { [resDef.idField]: {} as Subquery };
					return mapValues(props, (propQuery, propName) => {
						if (propName in resDef.relationships) {
							const relDef = resDef.relationships[propName];

							return relDef.cardinality === "one"
								? res[propName]
									? compileSubquery(relDef.resource, { ...propQuery, id: res[propName] })
									: null
								: res[propName].map((id) =>
									compileSubquery(relDef.resource, { ...propQuery, id }),
								  );
						}

						return res[propName];
					});
				};

				if ("id" in subquery) {
					const id = evaluateId(subquery.id, args);
					const res = data[resType][id];

					return res ? getProperties(res) : null;
				}

				return Object.values(data[resType]).map(getProperties);
			};

			return compileSubquery(rootQuery.type, rootQuery);
		};
	};

	const get = (rootQuery: Query, args = {}) => {
		return compileQuery(rootQuery)(args);
	};

	return { compileQuery, get, seed };
}
