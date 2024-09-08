import { mapValues } from "lodash-es";

export function update(store) {
	return async (req, res) => {
		try {
			const { data: resource } = req.body;
			const normalized = {
				...resource,
				relationships: mapValues(
					resource.relationships ?? {},
					(rel) => rel.data,
				),
			};

			const out = await store.update(normalized);
			res.statusCode = 200;
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
