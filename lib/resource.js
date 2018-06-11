'use strict';

const { Transform } = require('readable-stream');
const Resolver = require('./resolver');
const Metrics = require('@podium/metrics');
const assert = require('assert');
const State = require('./state');

function decoratePodletName(podletName) {
    return new Transform({
        objectMode: true,
        transform(metric, encoding, callback) {
            metric.podlet = podletName;
            callback(null, metric);
        },
    });
}

module.exports = class PodletClientResource {
    constructor(registry, options = {}) {
        assert(
            registry,
            'you must pass a "registry" object to the PodletClientResource constructor'
        );

        Object.defineProperty(this, 'options', {
            value: options,
        });

        Object.defineProperty(this, 'resolver', {
            value: new Resolver(registry, options),
        });

        Object.defineProperty(this, 'metrics', {
            enumerable: true,
            value: new Metrics(),
        });

        this.resolver.metrics
            .pipe(decoratePodletName(this.options.name))
            .pipe(this.metrics);
    }

    get [Symbol.toStringTag]() {
        return 'PodletClientResource';
    }

    get uri() {
        return this.options.uri;
    }

    get name() {
        return this.options.name;
    }

    fetch(podiumContext, options = {}) {
        const state = new State(
            this.options,
            {
                ...options,
                podiumContext,
            },
            false
        );

        return this.resolver.resolve(state).then(obj => obj.content);
    }

    stream(podiumContext, options = {}) {
        const state = new State(
            this.options,
            {
                ...options,
                podiumContext,
            },
            true
        );

        this.resolver.resolve(state).then(() => {
            // console.log('stream success');
        });

        return state.stream;
    }
};
