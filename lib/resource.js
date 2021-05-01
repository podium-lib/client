/* eslint-disable no-param-reassign */

import Metrics from '@metrics/client';
import stream from 'readable-stream';
import abslog from 'abslog';
import assert from 'assert';

import HttpOutgoing from './http-outgoing.js';
import Response from './response.js';
import Resolver from './resolver.js';
import * as utils from './utils.js';

const inspect = Symbol.for('nodejs.util.inspect.custom');

export default class PodiumClientResource {
    #resolver;
    #options;
    #metrics;
    #state;
    constructor(registry, state, options = {}) {
        assert(
            registry,
            'you must pass a "registry" object to the PodiumClientResource constructor',
        );

        assert(
            state,
            'you must pass a "state" object to the PodiumClientResource constructor',
        );

        const log = abslog(options.logger);

        this.#resolver = new Resolver(registry, options);
        this.#options = options;
        this.#metrics = new Metrics();
        this.#state = state;

        this.#metrics.on('error', error => {
            log.error(
                'Error emitted by metric stream in @podium/client module',
                error,
            );
        });

        this.#resolver.metrics.pipe(this.#metrics);
    }

    get metrics() {
        return this.#metrics;
    }

    get name() {
        return this.#options.name;
    }

    get uri() {
        return this.#options.uri;
    }

    async fetch(incoming = {}, reqOptions = {}) {
        if (!utils.validateIncoming(incoming)) throw new TypeError('you must pass an instance of "HttpIncoming" as the first argument to the .fetch() method');
        const outgoing = new HttpOutgoing(this.#options, reqOptions, incoming);

        this.#state.setInitializingState();

        const chunks = [];
        const to = new stream.Writable({
            write: (chunk, encoding, next) => {
                chunks.push(chunk);
                next();
            },
        });

        stream.pipeline(outgoing, to);

        const { manifest, headers, redirect } = await this.#resolver.resolve(
            outgoing,
        );

        const content = !outgoing.redirect
            ? Buffer.concat(chunks).toString()
            : '';

        return new Response({
            headers,
            content,
            css: manifest.css,
            js: manifest.js,
            redirect,
        });
    }

    stream(incoming = {}, reqOptions = {}) {
        if (!utils.validateIncoming(incoming)) throw new TypeError('you must pass an instance of "HttpIncoming" as the first argument to the .stream() method');
        const outgoing = new HttpOutgoing(this.#options, reqOptions, incoming);
        this.#state.setInitializingState();
        this.#resolver.resolve(outgoing);
        return outgoing;
    }

    refresh(incoming = {}, reqOptions = {}) {
        const outgoing = new HttpOutgoing(this.#options, reqOptions, incoming);
        this.#state.setInitializingState();
        return this.#resolver.refresh(outgoing).then(obj => obj);
    }

    [inspect]() {
        return {
            metrics: this.metrics,
            name: this.name,
            uri: this.uri,
        };
    }

    get [Symbol.toStringTag]() {
        return 'PodiumClientResource';
    }
};
