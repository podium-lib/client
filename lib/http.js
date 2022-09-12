import { request } from 'undici';

export default class HTTP {
    #client;

    constructor() {
        this.#client = { request };
    }

    async request(url, options) {
        const { statusCode, headers, body } = await this.#client.request(url, options);
        return { statusCode, headers, body };
    }
}