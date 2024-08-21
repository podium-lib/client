import { request } from 'undici';

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
    /**
     * @param {string} url
     * @param {PodiumHttpClientRequestOptions} options
     * @returns {Promise<Pick<import('undici').Dispatcher.ResponseData, 'statusCode' | 'headers' | 'body'>>}
     */
    async request(url, options) {
        const { statusCode, headers, body } = await request(new URL(url), {
            ...options,
            signal: AbortSignal.timeout(options.timeout || 1000),
        });
        return { statusCode, headers, body };
    }
}
