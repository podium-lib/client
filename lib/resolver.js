'use strict';

const abslog = require('abslog');
const assert = require('assert');
const Manifest = require('./resolver.manifest');
const Fallback = require('./resolver.fallback');
const Content = require('./resolver.content');
const Cache = require('./resolver.cache');

module.exports = class PodletClientResolver {
    constructor(registry, metrics, options = {}) {
        assert(
            registry,
            'you must pass a "registry" object to the PodletClientResolver constructor',
        );

        assert(
            metrics,
            'you must pass a @metrics/client to the PodletClientResolver constructor',
        );

        Object.defineProperty(this, 'log', {
            value: abslog(options.logger),
        });

        Object.defineProperty(this, 'cache', {
            value: new Cache(registry, options),
        });

        Object.defineProperty(this, 'manifest', {
            value: new Manifest(metrics, options),
        });

        Object.defineProperty(this, 'fallback', {
            value: new Fallback(metrics, options),
        });

        Object.defineProperty(this, 'content', {
            value: new Content(metrics, options),
        });

        Object.defineProperty(this, 'metrics', {
            enumerable: true,
            value: metrics,
        });
    }

    get [Symbol.toStringTag]() {
        return 'PodletClientResolver';
    }

    resolve(outgoing) {
        return this.cache
            .load(outgoing)
            .then(obj => this.manifest.resolve(obj))
            .then(obj => this.fallback.resolve(obj))
            .then(obj => this.content.resolve(obj))
            .then(obj => this.cache.save(obj))
            .then(obj => {
                if (obj.success) {
                    return obj;
                }
                return this.resolve(obj);
            });
    }

    refresh(outgoing) {
        return this.manifest
            .resolve(outgoing)
            .then(obj => this.fallback.resolve(obj))
            .then(obj => this.cache.save(obj))
            .then(obj => !!obj.manifest.name);
    }
};
