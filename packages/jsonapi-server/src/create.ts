import { mapValues } from "lodash-es";
import { Schema } from "data-prism";
import { validateRequest } from "./validate-request.js";

type Ref = { type: string; id: string };
export type CreateRequest = {
	data: {
		type: string;
		id?: string;
		attributes?: { [k: string]: unknown };
		relationships?: {
			[k: string]: Ref | Ref[];
		};
	};
};

export function create(schema: Schema, store) {
	return async (req, res) => {
		const body: CreateRequest = req.body;
		const validationErrors = validateRequest(schema, body);
		if (validationErrors) {
			res.statusCode = 400;
			res.send({ errors: validationErrors });
			return;
		}

		try {
			const { data: resource } = req.body;
			const normalized = {
				...resource,
				relationships: mapValues(
					resource.relationships ?? {},
					(rel) => rel.data,
				),
			};

			const out = await store.create(normalized);
			res.statusCode = 201;
			res.json({
				data: {
					...out,
					relationships: mapValues(out.relationships, (rel) => ({ data: rel })),
				},
			});
		} catch (err) {
			console.log(err);
			res.statusCode = 500;
			res.send("something went wrong");
		}
	};
}
