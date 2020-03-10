/* eslint-disable no-underscore-dangle */
/* eslint-disable no-param-reassign */

'use strict';

const Metrics = require('@metrics/client');
const stream = require('readable-stream');
const abslog = require('abslog');
const assert = require('assert');
const util = require('util');

const HttpOutgoing = require('./http-outgoing');
const Response = require('./response');
const Resolver = require('./resolver');

const _resolver = Symbol('podium:client:resource:resolver');
const _options = Symbol('podium:client:resource:options');
const _metrics = Symbol('podium:client:resource:metrics');
const _state = Symbol('podium:client:resource:state');

const PodiumClientResource = class PodiumClientResource {
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

        this[_resolver] = new Resolver(registry, options);
        this[_options] = options;
        this[_metrics] = new Metrics();
        this[_state] = state;

        this[_metrics].on('error', error => {
            log.error(
                'Error emitted by metric stream in @podium/client module',
                error,
            );
        });

        this[_resolver].metrics.pipe(this[_metrics]);
    }

    get metrics() {
        return this[_metrics];
    }

    get name() {
        return this[_options].name;
    }

    get uri() {
        return this[_options].uri;
    }

    async fetch(incoming = {}, reqOptions = {}) {
        const outgoing = new HttpOutgoing(this[_options], reqOptions, incoming);

        this[_state].setInitializingState();

        const chunks = [];
        const to = new stream.Writable({
            write: (chunk, encoding, next) => {
                chunks.push(chunk);
                next();
            },
        });

        stream.pipeline(outgoing, to);

        const { manifest, headers, redirect } = await this[_resolver].resolve(
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
        const outgoing = new HttpOutgoing(this[_options], reqOptions, incoming);
        this[_state].setInitializingState();
        this[_resolver].resolve(outgoing);
        return outgoing;
    }

    refresh(incoming = {}, reqOptions = {}) {
        const outgoing = new HttpOutgoing(this[_options], reqOptions, incoming);
        this[_state].setInitializingState();
        return this[_resolver].refresh(outgoing).then(obj => obj);
    }

    get [Symbol.toStringTag]() {
        return 'PodiumClientResource';
    }

    [util.inspect.custom](depth, options) {
        return util.inspect(
            {
                metrics: this.metrics,
                name: this.name,
                uri: this.uri,
            },
            depth,
            options,
        );
    }
};
module.exports = PodiumClientResource;
