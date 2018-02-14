'use strict';

const Resolver = require('./resolver');
const Metrics = require('@podium/metrics');
const assert = require('assert');
const State = require('./state');

function getReqOptions({
    podiumContext,
    options,
    stateOptions,
    resourceName,
    streamThrough,
}) {
    assert(podiumContext, 'podiumContext has to be provided to fetch');

    const reqOptions = {
        pathname: '',
        query: {},
        ...options,
        podiumContext,
        resourceName,
    };

    return new State(stateOptions, reqOptions, streamThrough);
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

        this.resolver.metrics.pipe(this.metrics);
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
        const state = getReqOptions({
            podiumContext,
            options,
            stateOptions: this.options,
            resourceName: this.name,
            streamThrough: false,
        });

        return this.resolver.resolve(state).then(obj => obj.content);
    }

    stream(podiumContext, options = {}) {
        const state = getReqOptions({
            podiumContext,
            options,
            stateOptions: this.options,
            resourceName: this.name,
            streamThrough: true,
        });

        this.resolver.resolve(state).then(() => {
            // console.log('stream success');
        });

        return state.stream;
    }
};
