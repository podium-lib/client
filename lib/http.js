import { request as undiciRequest } from 'undici';

/**
 * @typedef {object} PodiumHttpClientRequestOptions
 * @property {'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'CONNECT' | 'OPTIONS' | 'TRACE' | 'PATCH'} method
 * @property {boolean} [json]
 * @property {boolean} [rejectUnauthorized]
 * @property {boolean} [follow]
 * @property {number} [timeout]
 * @property {object} [query]
 * @property {import('http').IncomingHttpHeaders} [headers]
 */

export default class HTTP {
    constructor(requestFn = undiciRequest) {
        this.requestFn = requestFn;
    }

    /**
     * @param {string} url
     * @param {PodiumHttpClientRequestOptions} options
     * @returns {Promise<Pick<import('undici').Dispatcher.ResponseData, 'statusCode' | 'headers' | 'body'>>}
     */
    async request(url, options) {
        const abortController = new AbortController();

        const timeoutId = setTimeout(() => {
            abortController.abort();
        }, options.timeout || 1000);

        try {
            const { statusCode, headers, body } = await this.requestFn(
                new URL(url),
                {
                    ...options,
                    signal: abortController.signal,
                },
            );
            return { statusCode, headers, body };
        } finally {
            clearTimeout(timeoutId);
        }
    }
}
