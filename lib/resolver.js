'use strict';

const Metrics = require('@metrics/client');
const abslog = require('abslog');
const assert = require('assert');
const Manifest = require('./resolver.manifest');
const Fallback = require('./resolver.fallback');
const Content = require('./resolver.content');
const Cache = require('./resolver.cache');

module.exports = class PodletClientResolver {
    constructor(registry, options = {}) {
        assert(
            registry,
            'you must pass a "registry" object to the PodletClientResolver constructor',
        );

        Object.defineProperty(this, 'log', {
            value: abslog(options.logger),
        });

        Object.defineProperty(this, 'cache', {
            value: new Cache(registry, options),
        });

        Object.defineProperty(this, 'manifest', {
            value: new Manifest(options),
        });

        Object.defineProperty(this, 'fallback', {
            value: new Fallback(options),
        });

        Object.defineProperty(this, 'content', {
            value: new Content(options),
        });

        Object.defineProperty(this, 'metrics', {
            enumerable: true,
            value: new Metrics(),
        });

        this.metrics.on('error', error => {
            this.log.error(
                'Error emitted by metric stream in @podium/client module',
                error,
            );
        });

        this.content.metrics.pipe(this.metrics);
        this.fallback.metrics.pipe(this.metrics);
        this.manifest.metrics.pipe(this.metrics);
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
