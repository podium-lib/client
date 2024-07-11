import Metrics from '@metrics/client';
import abslog from 'abslog';
import assert from 'assert';

import HttpOutgoing from './http-outgoing.js';
import Response from './response.js';
import Resolver from './resolver.js';
import * as utils from './utils.js';

const inspect = Symbol.for('nodejs.util.inspect.custom');

/**
 * @typedef {object} RequestFilterOptions
 * @property {string[]} [deviceType] List of values for the `x-podium-device-type` HTTP request header.
 */

/**
 * @typedef {object} PodiumClientResourceOptions
 * @property {import('abslog').AbstractLoggerOptions} [logger]
 * @property {string} clientName
 * @property {string} name
 * @property {string} uri To the podlet's `manifest.json`
 * @property {number} timeout In milliseconds
 * @property {number} maxAge
 * @property {number} [retries]
 * @property {boolean} [throwable]
 * @property {boolean} [redirectable]
 * @property {boolean} [rejectUnauthorized]
 * @property {import('http').Agent} [httpAgent]
 * @property {import('https').Agent} [httpsAgent]
 * @property {RequestFilterOptions} [excludeBy] Used by `fetch` to conditionally skip fetching the podlet content based on values on the request.
 * @property {RequestFilterOptions} [includeBy] Used by `fetch` to conditionally skip fetching the podlet content based on values on the request.
 */

export default class PodiumClientResource {
    #resolver;
    #options;
    #metrics;
    #state;

    /**
     * @constructor
     * @param {import('ttl-mem-cache').default} registry
     * @param {import('./state.js').default} state
     * @param {PodiumClientResourceOptions} options
     */
    // @ts-expect-error Deliberate for better error messages
    constructor(registry, state, options = {}) {
        assert(
            registry,
            'you must pass a "registry" object to the PodiumClientResource constructor',
        );

        assert(
            state,
            'you must pass a "state" object to the PodiumClientResource constructor',
        );

        const log = abslog(options.logger);

        this.#resolver = new Resolver(registry, options);
        this.#options = options;
        this.#metrics = new Metrics();
        this.#state = state;

        this.#metrics.on('error', (error) => {
            log.error(
                'Error emitted by metric stream in @podium/client module',
                error,
            );
        });

        this.#resolver.metrics.pipe(this.#metrics);
    }

    get metrics() {
        return this.#metrics;
    }

    get name() {
        return this.#options.name;
    }

    get uri() {
        return this.#options.uri;
    }

    /**
     * Fetch the podlet's content, or fallback if the podlet is unavailable.
     * The podlet response includes references to its CSS and JS assets which should be included in the final HTML document.
     *
     * @param {import('@podium/utils').HttpIncoming} incoming Instance of HttpIncoming
     * @param {import('./http-outgoing.js').PodiumClientResourceOptions} [reqOptions={}] Optional parameters to the HTTP request, such as query parameters or HTTP request headers.
     * @returns {Promise<import('./response.js').default>}
     *
     * @example
     * ```js
     * const incoming = res.locals.podium; // Express server example
     * const header = await headerPodlet.fetch(incoming);
     * incoming.podlets = [header]; // Register the podlet's JS and CSS assets with the layout's HTML template
     * ```
     */
    async fetch(incoming, reqOptions = {}) {
        if (!utils.validateIncoming(incoming))
            throw new TypeError(
                'you must pass an instance of "HttpIncoming" as the first argument to the .fetch() method',
            );
        const outgoing = new HttpOutgoing(this.#options, reqOptions, incoming);

        if (this.#options.excludeBy) {
            /**
             * @type {string[] | undefined}
             */
            const excludedDeviceTypes = this.#options.excludeBy.deviceType;
            if (Array.isArray(excludedDeviceTypes)) {
                const deviceTypeHeader =
                    incoming.request.headers['x-podium-device-type'];

                for (let i = 0; i < excludedDeviceTypes.length; i += 1) {
                    const shouldSkip =
                        excludedDeviceTypes[i] === deviceTypeHeader;
                    if (shouldSkip) {
                        return new Response({
                            headers: {},
                            content: '',
                            css: [],
                            js: [],
                            redirect: null,
                        });
                    }
                }
            }
        }

        if (this.#options.includeBy) {
            /**
             * @type {string[] | undefined}
             */
            const includeDeviceTypes = this.#options.includeBy.deviceType;
            if (Array.isArray(includeDeviceTypes)) {
                const deviceTypeHeader =
                    incoming.request.headers['x-podium-device-type'];

                const shouldRequest =
                    !deviceTypeHeader ||
                    includeDeviceTypes.includes(deviceTypeHeader);

                if (!shouldRequest) {
                    return new Response({
                        headers: {},
                        content: '',
                        css: [],
                        js: [],
                        redirect: null,
                    });
                }
            }
        }

        this.#state.setInitializingState();

        const { manifest, headers, redirect, isFallback } =
            await this.#resolver.resolve(outgoing);

        const chunks = [];

        for await (const chunk of outgoing) {
            chunks.push(chunk);
        }

        const content = !outgoing.redirect
            ? Buffer.concat(chunks).toString()
            : '';

        return new Response({
            headers,
            content,
            css: utils.filterAssets(
                isFallback ? 'fallback' : 'content',
                manifest.css,
            ),
            js: utils.filterAssets(
                isFallback ? 'fallback' : 'content',
                manifest.js,
            ),
            redirect,
        });
    }

    /**
     * Stream the podlet's content, or fallback if the podlet is unavailable.
     *
     * @param {import('@podium/utils').HttpIncoming} incoming
     * @param {import('./http-outgoing.js').PodiumClientResourceOptions} [reqOptions={}]
     * @returns {import('./http-outgoing.js').default}
     */
    stream(incoming, reqOptions = {}) {
        if (!utils.validateIncoming(incoming))
            throw new TypeError(
                'you must pass an instance of "HttpIncoming" as the first argument to the .stream() method',
            );
        const outgoing = new HttpOutgoing(this.#options, reqOptions, incoming);
        this.#state.setInitializingState();
        this.#resolver.resolve(outgoing);
        return outgoing;
    }

    /**
     * Refresh the podlet's manifest and fallback in the cache.
     *
     * @param {import('@podium/utils').HttpIncoming} [incoming]
     * @param {import('./http-outgoing.js').PodiumClientResourceOptions} [reqOptions={}]
     * @returns {Promise<boolean>} `true` if succesful
     */
    refresh(incoming, reqOptions = {}) {
        const outgoing = new HttpOutgoing(this.#options, reqOptions, incoming);
        this.#state.setInitializingState();
        return this.#resolver.refresh(outgoing).then((obj) => obj);
    }

    [inspect]() {
        return {
            metrics: this.metrics,
            name: this.name,
            uri: this.uri,
        };
    }

    get [Symbol.toStringTag]() {
        return 'PodiumClientResource';
    }
}
