import { mapValues } from "lodash-es";
export function create(store) {
    return async (req, res) => {
        try {
            const { data: resource } = req.body;
            const normalized = {
                ...resource,
                relationships: mapValues(resource.relationships ?? {}, (rel) => rel.data),
            };
            const out = await store.create(normalized);
            res.statusCode = 201;
            res.json({
                data: {
                    ...out,
                    relationships: mapValues(out.relationships, (rel) => ({ data: rel })),
                },
            });
        }
        catch (err) {
            console.log(err);
            res.statusCode = 500;
            res.send("something went wrong");
        }
    };
}
