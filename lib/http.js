import { Client } from 'undici';

export default class HTTP {
    // #client;

    // constructor() {
    //     // this.#client = { request };
    // }

    async request(url, options) {
        const u = new URL(url);
        const client = new Client(u.origin, {
            ...options,
            connect: { rejectUnauthorized: options.rejectUnauthorized },
        });

        const { statusCode, headers, body } = await client.request({
            ...options,
            path: u.pathname,
        });
        return { statusCode, headers, body };
    }
}
