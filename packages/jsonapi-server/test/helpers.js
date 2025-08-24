import http from "http";
import axios from "axios";

export const rawApi = axios.create({ baseURL: "http://127.0.0.1:3000" });

export const api = {
	get(path, options = {}) {
		return rawApi.get(path, options).then((x) => x.data);
	},
	post(path, body, options = {}) {
		return rawApi.post(path, body, options).then((x) => x.data);
	},
	patch(path, body, options = {}) {
		return rawApi.patch(path, body, options).then((x) => x.data);
	},
	delete(path, options = {}) {
		return rawApi.delete(path, options).then((x) => x.data);
	},
};

export function makeRequest(path, method = "GET") {
	const options = {
		host: "127.0.0.1",
		port: 3000,
		method,
		path: encodeURI(path),
	};

	return new Promise((resolve, reject) => {
		const req = http.request(options, (res) => {
			if (res.statusCode < 200 || res.statusCode >= 300) {
				// Reject on bad status code
				reject({ response: res });
				return;
			}

			let body = [];
			res.on("data", (chunk) => {
				body.push(chunk);
			});

			res.on("end", () => {
				try {
					body = JSON.parse(Buffer.concat(body).toString());
					resolve(body);
				} catch (e) {
					reject(e);
				}
			});
		});

		req.on("error", (err) => {
			// Reject on request error
			reject(err);
		});

		// If there's post data, write it to the request
		// Important: Always end the request
		req.end();
	});
}
