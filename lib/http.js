import { request as undiciRequest, Agent, interceptors } from 'undici';

const { dns } = interceptors;

const undiciDispatcher = new Agent().compose([
    /* cache DNS lookups */
    dns({
        maxTTL: 10000 /* match the default TTL for dns lookups */,
        dualStack: false,
        affinity: 4,
    }),
]);

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

/** Wrapper for undici */
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
                    dispatcher: undiciDispatcher,
                },
            );
            return { statusCode, headers, body };
        } finally {
            clearTimeout(timeoutId);
        }
    }
}
