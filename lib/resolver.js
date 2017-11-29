'use strict';

const Manifest = require('./resolver.manifest');
const Fallback = require('./resolver.fallback');
const Content = require('./resolver.content');
const abslog = require('abslog');
const Cache = require('./resolver.cache');

module.exports = class PodletClientResolver {
    constructor(options = {}) {
        Object.defineProperty(this, 'log', {
            value: abslog(options.logger),
        });

        Object.defineProperty(this, 'cache', {
            value: new Cache(options),
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
    }

    get [Symbol.toStringTag]() {
        return 'PodletClientResolver';
    }

    resolve(state) {
        return this.cache
            .load(state)
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
};
