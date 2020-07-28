/* eslint-disable no-plusplus */
/* eslint-disable no-param-reassign */

'use strict';

const clonedeep = require('lodash.clonedeep');
const abslog = require('abslog');
const assert = require('assert');

module.exports = class PodletClientCacheResolver {
    #registry;
    #log;
    constructor(registry, options = {}) {
        assert(
            registry,
            'you must pass a "registry" object to the PodletClientCacheResolver constructor',
        );
        this.#registry = registry;
        this.#log = abslog(options.logger);
    }

    load(outgoing) {
        return new Promise(resolve => {
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

    save(outgoing) {
        return new Promise(resolve => {
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
};
