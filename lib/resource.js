'use strict';

const EventEmitter = require('events');
const State = require('./state');
const resolver = require('./resolver');


module.exports = class Resource extends EventEmitter {
    constructor(registry, options) {
        super();
        this.registry = registry;
        this.options = Object.assign({}, options);
    }

    fetch(options = {}) {
        const reqOptions = Object.assign({
            pathname: '',
            query: {}
        }, options);

        const state = new State(this.registry, this.options.uri, reqOptions, false);
        state.on('info', (info) => {
            this.emit('info', info);
        });

        return resolver(state).then((obj) => {
            return obj.content;
        });
    }

    stream(options = {}) {
        const reqOptions = Object.assign({
            pathname: '',
            query: {}
        }, options);

        const state = new State(this.registry, this.options.uri, reqOptions, true);
        state.on('info', (info) => {
            this.emit('info', info);
        });

        resolver(state).then((obj) => {
//            console.log('stream success');
        }).catch((error) => {
            state.stream.emit('error', error);
        });

        return state.stream;
    }
};
