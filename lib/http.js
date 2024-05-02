import { request } from 'undici';

export default class HTTP {
    async request(url, options) {
        const { statusCode, headers, body } = await request(new URL(url), options);
        return { statusCode, headers, body };
    }
}
