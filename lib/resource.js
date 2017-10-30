'use strict';

const EventEmitter = require('events');
const resolver = require('./resolver');
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

    // TODO: Clean up how we set options, this has become messy
    stateOptions.throwable = options.throwable || false;
    return new State(registry, stateOptions, reqOptions, streamThrough);
}

module.exports = class Resource extends EventEmitter {
    constructor(registry, options = {}) {
        super();
        this.registry = registry;
        this.options = options;
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

        state.on('info', info => {
            this.emit('info', info);
        });

        return resolver(state).then(obj => obj.content);
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

        state.on('info', info => {
            this.emit('info', info);
        });

        resolver(state)
            .then(() => {
                // console.log('stream success');
            })
            .catch(error => {
                state.stream.emit('error', error);
            });

        return state.stream;
    }
};
