/* eslint-disable no-param-reassign */

'use strict';

const EventEmitter = require('events');
const Metrics = require('@metrics/client');
const stream = require('readable-stream');
const abslog = require('abslog');
const assert = require('assert');
const HttpOutgoing = require('./http-outgoing');
const Resolver = require('./resolver');

function decoratePodletName(podletName) {
    return new stream.Transform({
        objectMode: true,
        transform(metric, encoding, callback) {
            metric.meta.podlet = podletName;
            callback(null, metric);
        },
    });
}

const PodletClientResource = class PodletClientResource extends EventEmitter {
    constructor(registry, options = {}) {
        super();

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

        const chunks = [];
        const to = new stream.Writable({
            write: (chunk, encoding, next) => {
                chunks.push(chunk);
                next();
            },
        });

        stream.pipeline(outgoing, to);

        return this.resolver.resolve(outgoing).then(({ manifest }) => {
            const { assets } = manifest;
            const js = (assets && assets.js) || '';
            const css = (assets && assets.css) || '';
            const content = Buffer.concat(chunks).toString();
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

        return outgoing;
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
module.exports = PodletClientResource;
