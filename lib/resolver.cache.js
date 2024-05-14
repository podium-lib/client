/* eslint-disable no-plusplus */
/* eslint-disable no-param-reassign */

import clonedeep from 'lodash.clonedeep';
import abslog from 'abslog';
import assert from 'assert';

/**
 * @typedef {object} PodletClientCacheResolverOptions
 * @property {import('abslog').AbstractLoggerOptions} [logger]
 */

export default class PodletClientCacheResolver {
    #registry;
    #log;

    /**
     * @constructor
     * @param {import('ttl-mem-cache').default} registry
     * @param {PodletClientCacheResolverOptions} options
     */
    constructor(registry, options = {}) {
        assert(
            registry,
            'you must pass a "registry" object to the PodletClientCacheResolver constructor',
        );
        this.#registry = registry;
        this.#log = abslog(options.logger);
    }

    /**
     * Loads the podlet's manifest from cache if not stale
     *
     * @param {import('./http-outgoing.js').default} outgoing
     * @returns {Promise<import('./http-outgoing.js').default>}
     */
    load(outgoing) {
        return new Promise((resolve) => {
            if (outgoing.status !== 'stale') {
                const cached = this.#registry.get(outgoing.name);
                if (cached) {
                    outgoing.manifest = clonedeep(cached);
                    outgoing.status = 'cached';
                    this.#log.debug(
                        `loaded manifest from cache - resource: ${outgoing.name}`,
                    );
                }
            }
            resolve(outgoing);
        });
    }

    /**
     * Saves the podlet's manifest to the cache
     *
     * @param {import('./http-outgoing.js').default} outgoing
     * @returns {Promise<import('./http-outgoing.js').default>}
     */
    save(outgoing) {
        return new Promise((resolve) => {
            if (outgoing.status === 'fresh') {
                this.#registry.set(
                    outgoing.name,
                    outgoing.manifest,
                    outgoing.maxAge,
                );
                this.#log.debug(
                    `saved manifest to cache - resource: ${outgoing.name}`,
                );
            }

            outgoing.recursions++;

            resolve(outgoing);
        });
    }

    get [Symbol.toStringTag]() {
        return 'PodletClientCacheResolver';
    }
}
