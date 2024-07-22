import http from "http";

export function makeRequest(path) {
	const options = {
		host: "127.0.0.1",
		port: 3000,
		method: "GET",
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
