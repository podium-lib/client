'use strict';

const EventEmitter = require('events');
const Resource = require('./resource');
const Cache = require('ttl-mem-cache');
const http = require('http');
const joi = require('joi');

const URI_SCHEMA = joi.string().uri();

const HTTP_AGENT = new http.Agent({
    keepAlive: true,
    maxSockets: 10,
    maxFreeSockets: 10,
    timeout: 60000,
    keepAliveMsecs: 30000,
});

const MAX_AGE = Infinity;


module.exports = class PodletClient extends EventEmitter {
    constructor(options = {}) {
        super();
        this.options = Object.assign(
            {
                maxAge: MAX_AGE,
                agent: HTTP_AGENT,
            },
            options
        );

        this.registry = new Cache(this.options.maxAge);
        this.registry.on('dispose', key => {
            this.emit('dispose', key);
        });
    }

    register(options = {}) {
        if (!options.uri) {
            throw new Error('"options.uri" must be defined');
        }

        const validation = joi.validate(options.uri, URI_SCHEMA);
        if (validation.error) {
            throw new Error(
                `The value for "options.uri", ${options.uri}, is not a valid URI`
            );
        }

        const opts = Object.assign({ agent: this.options.agent }, options);

        return new Resource(this.registry, opts);
    }
};
