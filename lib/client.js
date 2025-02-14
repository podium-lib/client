import EventEmitter from 'events';
import {
    uriStrict as validateUriStrict,
    name as validateName,
} from '@podium/schemas';
import Metrics from '@metrics/client';
import abslog from 'abslog';
import Cache from 'ttl-mem-cache';
import http from 'http';
import https from 'https';
import Resource from './resource.js';
import State from './state.js';

const inspect = Symbol.for('nodejs.util.inspect.custom');
const HTTP_AGENT_OPTIONS = {
    keepAlive: true,
    maxSockets: 10,
    maxFreeSockets: 10,
    timeout: 60000,
    keepAliveMsecs: 30000,
};
const HTTPS_AGENT_OPTIONS = {
    ...HTTP_AGENT_OPTIONS,
    maxCachedSessions: 10,
};
const REJECT_UNAUTHORIZED = true;
const HTTP_AGENT = new http.Agent(HTTP_AGENT_OPTIONS);
const HTTPS_AGENT = new https.Agent(HTTPS_AGENT_OPTIONS);
const RETRIES = 4;
const TIMEOUT = 1000; // 1 seconds
const MAX_AGE = Infinity;

/**
 * @typedef {import('./resource.js').default} PodiumClientResource
 * @typedef {import('./resource.js').PodiumClientResourceOptions} PodiumClientResourceOptions
 * @typedef {import('./response.js').default} PodiumClientResponse
 * @typedef {import('./http-outgoing.js').PodiumRedirect} PodiumRedirect
 * @typedef {import('@podium/schemas').PodletManifestSchema} PodletManifest
 */

/**
 * @typedef {object} PodiumClientOptions
 * @property {string} name
 * @property {import('abslog').AbstractLoggerOptions} [logger]
 * @property {number} [retries=4]
 * @property {number} [timeout=1000] In milliseconds
 * @property {number} [maxAge=Infinity]
 * @property {boolean} [rejectUnauthorized=true]
 * @property {number} [resolveThreshold]
 * @property {number} [resolveMax]
 * @property {import('http').Agent} [httpAgent]
 * @property {import('https').Agent} [httpsAgent]
 */

/**
 * @typedef {object} RegisterOptions
 * @property {string} name A unique name for the podlet
 * @property {string} uri URL to the podlet's `manifest.json`
 * @property {number} [retries=4] Number of retries before serving fallback
 * @property {number} [timeout=1000] In milliseconds, the amount of time to wait before serving fallback.
 * @property {boolean} [throwable=false] Set to `true` and surround `fetch` in `try/catch` to serve different content in case podlet is unavailable. Will not server fallback content.
 * @property {boolean} [redirectable=false] Set to `true` to allow podlet to respond with a redirect. You need to look for the redirect response from the podlet and return a redirect response to the browser yourself.
 * @property {import('./resource.js').RequestFilterOptions} [excludeBy] Used by `fetch` to conditionally skip fetching the podlet content based on values on the request.
 * @property {import('./resource.js').RequestFilterOptions} [includeBy] Used by `fetch` to conditionally skip fetching the podlet content based on values on the request.
 */

export default class PodiumClient extends EventEmitter {
    #resources;
    #registry;
    #metrics;
    #counter;
    #histogram;
    #options;
    #state;

    /**
     * @constructor
     * @param {PodiumClientOptions} options
     */
    // @ts-expect-error Deliberate default empty options for better error messages
    constructor(options = {}) {
        super();
        const log = abslog(options.logger);

        if (validateName(options.name).error) {
            throw new Error(
                `The value, "${options.name}", for the required argument "name" on the Client constructor is not defined or not valid.`,
            );
        }

        this.#options = {
            name: '',
            retries: RETRIES,
            timeout: TIMEOUT,
            logger: options.logger,
            maxAge: MAX_AGE,
            rejectUnauthorized: REJECT_UNAUTHORIZED,
            httpAgent: HTTP_AGENT,
            httpsAgent: HTTPS_AGENT,
            includeBy: undefined,
            excludeBy: undefined,
            ...options,
        };

        this.#state = new State({
            resolveThreshold: options.resolveThreshold,
            resolveMax: options.resolveMax,
        });
        this.#state.on('state', (state) => {
            this.emit('state', state);
        });

        this.#resources = new Map();

        this.#registry = new Cache({
            changefeed: true,
            ttl: options.maxAge,
        });
        this.#registry.on('error', (error) => {
            log.error(
                'Error emitted by the registry in @podium/client module',
                error,
            );
        });

        this.#registry.on('set', () => {
            this.#state.setUnstableState();
        });

        this.#metrics = new Metrics();
        this.#metrics.on('error', (error) => {
            log.error(
                'Error emitted by metric stream in @podium/client module',
                error,
            );
        });

        this[Symbol.iterator] = () => ({
            items: Array.from(this.#resources).map((item) => item[1]),
            next: function next() {
                return {
                    done: this.items.length === 0,
                    value: this.items.shift(),
                };
            },
        });

        this.#counter = this.#metrics.counter({
            name: 'podium_client_registered_podlet_count',
            description: 'Number of podlets registered with the client',
            labels: {
                clientName: this.#options.name,
                resourceName: undefined,
                resourceUri: undefined,
            },
        });

        this.#histogram = this.#metrics.histogram({
            name: 'podium_client_refresh_manifests',
            description: 'Time taken for podium client to refresh manifests',
            labels: { name: this.#options.name },
            buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 10],
        });
    }

    get registry() {
        return this.#registry;
    }

    get metrics() {
        return this.#metrics;
    }

    get state() {
        return this.#state.status;
    }

    /**
     * Register a podlet so you can fetch its contents later with {@link PodiumClientResource.fetch}.
     *
     * @param {RegisterOptions} options
     * @returns {PodiumClientResource}
     *
     * @example
     * ```js
     * const headerPodlet = layout.client.register({
     *   name: 'header',
     *   uri: 'http://header/manifest.json',
     * });
     * ```
     */
    register(options) {
        if (validateName(options.name).error)
            throw new Error(
                `The value, "${options.name}", for the required argument "name" on the .register() method is not defined or not valid.`,
            );

        if (validateUriStrict(options.uri).error)
            throw new Error(
                `The value, "${options.uri}", for the required argument "uri" on the .register() method is not defined or not valid.`,
            );

        if (this.#resources.has(options.name)) {
            throw new Error(
                `Resource with the name "${options.name}" has already been registered.`,
            );
        }

        if (options.includeBy && options.excludeBy) {
            throw new Error(
                'A podlet can only be registered with either includeBy or excludeBy, not both.',
            );
        }

        const resourceOptions = {
            rejectUnauthorized: this.#options.rejectUnauthorized,
            clientName: this.#options.name,
            retries: this.#options.retries,
            timeout: this.#options.timeout,
            logger: this.#options.logger,
            maxAge: this.#options.maxAge,
            httpsAgent: this.#options.httpsAgent,
            httpAgent: this.#options.httpAgent,
            includeBy: this.#options.includeBy,
            excludeBy: this.#options.excludeBy,
            ...options,
        };

        const resource = new Resource(
            this.#registry,
            this.#state,
            resourceOptions,
        );

        this.#counter.inc({
            labels: {
                resourceName: options.name,
                resourceUri: options.uri,
            },
        });

        resource.metrics.pipe(this.#metrics);

        Object.defineProperty(this, options.name, {
            get: () => this.#resources.get(options.name),
            set: () => {
                throw new Error('Cannot set read-only property.');
            },
        });

        this.#resources.set(options.name, resource);
        return resource;
    }

    dump() {
        return this.#registry.dump();
    }

    load(dump) {
        return this.#registry.load(dump);
    }

    /**
     * Refreshes the cached podlet manifest for all {@link register}ed podlets.
     */
    async refreshManifests() {
        const end = this.#histogram.timer();

        // Don't return this
        await Promise.all(
            Array.from(this.#resources).map((resource) =>
                resource[1].refresh(),
            ),
        );

        end();
    }

    [inspect]() {
        return {
            metrics: this.metrics,
            state: this.state,
        };
    }

    get [Symbol.toStringTag]() {
        return 'PodiumClient';
    }
}
