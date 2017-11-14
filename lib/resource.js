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

    return new State(registry, stateOptions, reqOptions, streamThrough);
}

module.exports = class PodletClientResource extends EventEmitter {
    constructor(registry, options = {}) {
        super();

        Object.defineProperty(this, 'registry', {
            value: registry,
        });

        Object.defineProperty(this, 'options', {
            value: options,
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

        state.on('debug', info => {
            this.emit('debug', info);
        });

        state.on('info', info => {
            this.emit('info', info);
        });

        state.on('warn', info => {
            this.emit('warn', info);
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

        state.on('debug', info => {
            this.emit('debug', info);
        });

        state.on('info', info => {
            this.emit('info', info);
        });

        state.on('warn', info => {
            this.emit('warn', info);
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
