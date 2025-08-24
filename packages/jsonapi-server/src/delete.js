/**
 * Creates a JSON:API DELETE handler for a specific resource type
 * @param {string} type - The resource type to handle
 * @param {*} store - The data store instance
 * @returns {(req: any, res: any) => Promise<void>} Express request handler
 */
export function deleteHandler(type, store) {
	return async (req, res) => {
		try {
			const { id } = req.params;

			await store.delete({ type, id });

			res.statusCode = 204;
			res.send("check");
		} catch (err) {
			console.log(err);
			res.statusCode = 500;
			res.send("something went wrong");
		}
	};
}
