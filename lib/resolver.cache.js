'use strict';

const abslog = require('abslog');

module.exports = class PodletClientCacheResolver {
    constructor(options = {}) {
        Object.defineProperty(this, 'log', {
            value: abslog(options.logger),
        });
    }

    get [Symbol.toStringTag]() {
        return 'PodletClientCacheResolver';
    }

    load(state) {
        return new Promise(resolve => {
            const cached = state.registry.get(state.uri);
            if (cached) {
                state.manifest = cached;
                state.status = 'cached';
                this.log.debug('loaded manifest from cache', state.manifestUri);
            }
            resolve(state);
        });
    }

    save(state) {
        return new Promise(resolve => {
            if (state.status === 'fresh') {
                state.registry.set(state.uri, state.manifest, state.maxAge);
                this.log.debug('saved manifest to cache', state.manifestUri);
            }

            if (state.status === 'stale') {
                state.registry.del(state.uri);
                state.status = 'empty';
                this.log.debug(
                    'deleted manifest from cache',
                    state.manifestUri
                );
            }
            resolve(state);
        });
    }
};
