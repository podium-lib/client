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
 * @property {(info: { statusCode: number; headers: Record<string, string | string[]>; }) => void} [onInfo]
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
    request(url, options) {
        return this.requestFn(new URL(url), {
            ...options,
            signal: AbortSignal.timeout(options.timeout || 1000),
        }).then(({ statusCode, headers, body }) => {
            return { statusCode, headers, body };
        });
    }
}
