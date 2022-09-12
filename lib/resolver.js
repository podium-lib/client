import Metrics from '@metrics/client';
import abslog from 'abslog';
import assert from 'assert';
import HTTP from './http.js';
import Manifest from './resolver.manifest.js';
import Fallback from './resolver.fallback.js';
import Content from './resolver.content.js';
import Cache from './resolver.cache.js';

export default class PodletClientResolver {
    #http;
    #cache;
    #manifest;
    #fallback;
    #content;
    #metrics;
    constructor(registry, options = {}) {
        assert(
            registry,
            'you must pass a "registry" object to the PodletClientResolver constructor',
        );

        const log = abslog(options.logger);
        this.#http = new HTTP();
        this.#cache = new Cache(registry, options);
        this.#manifest = new Manifest({ ...options, http: this.#http });
        this.#fallback = new Fallback({ ...options, http: this.#http });
        this.#content = new Content({ ...options, http: this.#http });
        this.#metrics = new Metrics();

        this.#metrics.on('error', error => {
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

    resolve(outgoing) {
        return this.#cache
            .load(outgoing)
            .then(obj => this.#manifest.resolve(obj))
            .then(obj => this.#fallback.resolve(obj))
            .then(obj => this.#content.resolve(obj))
            .then(obj => this.#cache.save(obj))
            .then(obj => {
                if (obj.success) {
                    return obj;
                }
                return this.resolve(obj);
            });
    }

    refresh(outgoing) {
        return this.#manifest
            .resolve(outgoing)
            .then(obj => this.#fallback.resolve(obj))
            .then(obj => this.#cache.save(obj))
            .then(obj => !!obj.manifest.name);
    }

    get [Symbol.toStringTag]() {
        return 'PodletClientResolver';
    }
};
