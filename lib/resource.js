/* eslint-disable no-param-reassign */

'use strict';

const { Transform } = require('readable-stream');
const Metrics = require('@metrics/client');
const abslog = require('abslog');
const assert = require('assert');
const Resolver = require('./resolver');
const State = require('./state');

function decoratePodletName(podletName) {
    return new Transform({
        objectMode: true,
        transform(metric, encoding, callback) {
            metric.meta.podlet = podletName;
            callback(null, metric);
        },
    });
}

module.exports = class PodletClientResource {
    constructor(registry, options = {}) {
        assert(
            registry,
            'you must pass a "registry" object to the PodletClientResource constructor',
        );

        Object.defineProperty(this, 'options', {
            value: options,
        });

        Object.defineProperty(this, 'log', {
            value: abslog(options.logger),
        });

        Object.defineProperty(this, 'resolver', {
            value: new Resolver(registry, options),
        });

        Object.defineProperty(this, 'metrics', {
            enumerable: true,
            value: new Metrics(),
        });

        this.metrics.on('error', error => {
            this.log.error('Error emitted by metric stream', error);
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
            false,
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
            true,
        );

        this.resolver.resolve(state).then(() => {
            // console.log('stream success');
        });

        return state.stream;
    }

    refresh(podiumContext = {}, options = {}) {
        const state = new State(
            this.options,
            {
                ...options,
                podiumContext,
            },
            false,
        );

        return this.resolver.refresh(state).then(obj => obj);
    }
};
