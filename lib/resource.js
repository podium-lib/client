'use strict';

const Resolver = require('./resolver');
const assert = require('assert');
const State = require('./state');

function getReqOptions({
    podiumContext,
    options,
    registry,
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

    return new State(registry, stateOptions, reqOptions, streamThrough);
}

module.exports = class PodletClientResource {
    constructor(registry, options = {}) {
        Object.defineProperty(this, 'registry', {
            value: registry,
        });

        Object.defineProperty(this, 'options', {
            value: options,
        });

        Object.defineProperty(this, 'resolver', {
            value: new Resolver(options),
        });
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
            registry: this.registry,
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
            registry: this.registry,
            stateOptions: this.options,
            resourceName: this.name,
            streamThrough: true,
        });

        this.resolver
            .resolve(state)
            .then(() => {
                // console.log('stream success');
            })
            .catch(error => {
                state.stream.emit('error', error);
            });

        return state.stream;
    }
};
