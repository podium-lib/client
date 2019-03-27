/* eslint-disable no-param-reassign */

'use strict';

const { Transform } = require('readable-stream');
const Metrics = require('@metrics/client');
const abslog = require('abslog');
const assert = require('assert');
const HttpOutgoing = require('./http-outgoing');
const Resolver = require('./resolver');

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
            this.log.error('Error emitted by metric stream in @podium/client module', error);
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
        const outgoing = new HttpOutgoing(
            this.options,
            {
                ...options,
                podiumContext,
            },
            false,
        );

        return this.resolver.resolve(outgoing).then(({ content, manifest }) => {
            const { assets } = manifest;
            const js = (assets && assets.js) || '';
            const css = (assets && assets.css) || '';

            return { content, js, css };
        });
    }

    stream(podiumContext, options = {}) {
        const outgoing = new HttpOutgoing(
            this.options,
            {
                ...options,
                podiumContext,
            },
            true,
        );

        this.resolver.resolve(outgoing);

        return outgoing.stream;
    }

    refresh(podiumContext = {}, options = {}) {
        const outgoing = new HttpOutgoing(
            this.options,
            {
                ...options,
                podiumContext,
            },
            false,
        );

        return this.resolver.refresh(outgoing).then(obj => obj);
    }
};
