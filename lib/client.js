'use strict';

const EventEmitter = require('events');
const Resource = require('./resource');
const Cache = require('./cache');
const http = require('http');
const joi = require('joi');

const URI_SCHEMA = joi.string().uri();

const HTTP_AGENT = new http.Agent({
    keepAlive: true,
    maxSockets: 10,
    maxFreeSockets: 10,
    timeout: 60000,
    keepAliveMsecs: 30000
});


module.exports = class PodiumClient extends EventEmitter {
    constructor(options = {}) {
        super();
        this.agent = options.agent ? options.agent : HTTP_AGENT;
        this.registry = new Cache();
        this.registry.on('dispose', (key) => {
            this.emit('dispose', key);
        });
    }

    register(options = {}) {
        if (!options.uri) {
            throw new Error('"options.uri" must be defined');
        }

        const validation = joi.validate(options.uri, URI_SCHEMA);
        if (validation.error) {
            throw new Error(`The value for "options.uri", ${options.uri}, is not a valid URI`);
        }

        options.agent = this.agent;

        return new Resource(this.registry, options);
    }
};
