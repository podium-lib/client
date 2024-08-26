import { EventEmitter } from 'node:events';
import assert from 'node:assert';
import Metrics from '@metrics/client';
import abslog from 'abslog';
import HTTP from './http.js';
import Manifest from './resolver.manifest.js';
import Fallback from './resolver.fallback.js';
import Content from './resolver.content.js';
import Cache from './resolver.cache.js';

/**
 * @typedef {object} PodletClientResolverOptions
 * @property {string} clientName
 * @property {import('abslog').AbstractLoggerOptions} [logger]
 */

export default class PodletClientResolver extends EventEmitter {
    #cache;
    #manifest;
    #fallback;
    #content;
    #metrics;

    /**
     * @constructor
     * @param {import('ttl-mem-cache').default} registry
     * @param {PodletClientResolverOptions} options
     */
    // @ts-expect-error Deliberate default empty options for better error messages
    constructor(registry, options = {}) {
        super();
        assert(
            registry,
            'you must pass a "registry" object to the PodletClientResolver constructor',
        );

        const log = abslog(options.logger);
        const http = new HTTP();
        this.#cache = new Cache(registry, options);
        this.#manifest = new Manifest({
            clientName: options.clientName,
            logger: options.logger,
            http,
        });
        this.#fallback = new Fallback({ ...options, http });

        this.#content = new Content({ ...options, http });

        this.#metrics = new Metrics();

        this.#metrics.on('error', (error) => {
            log.error(
                'Error emitted by metric stream in @podium/client module',
                error,
            );
        });

        this.#content.metrics.pipe(this.#metrics);
        this.#fallback.metrics.pipe(this.#metrics);
        this.#manifest.metrics.pipe(this.#metrics);
    }

    get metrics() {
        return this.#metrics;
    }

    /**
     * Resolve the podlet's manifest, fallback and content
     *
     * @param {import('./http-outgoing.js').default} outgoing
     * @returns {Promise<import('./http-outgoing.js').default>}
     */
    resolve(outgoing) {
        return this.#cache
            .load(outgoing)
            .then((obj) => this.#manifest.resolve(obj))
            .then((obj) => this.#fallback.resolve(obj))
            .then((obj) => this.#content.resolve(obj))
            .then((obj) => this.#cache.save(obj))
            .then((obj) => {
                if (obj.success) {
                    return obj;
                }
                return this.resolve(obj);
            });
    }

    /**
     * Refresh the podlet's cached manifest and fallback
     *
     * @param {import('./http-outgoing.js').default} outgoing
     * @returns {Promise<boolean>} `true` if successful
     */
    refresh(outgoing) {
        return this.#manifest
            .resolve(outgoing)
            .then((obj) => this.#fallback.resolve(obj))
            .then((obj) => this.#cache.save(obj))
            .then((obj) => !!obj.manifest.name);
    }

    get [Symbol.toStringTag]() {
        return 'PodletClientResolver';
    }
}
