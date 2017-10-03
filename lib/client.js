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

        this.resources = new Map();
    }

    register(options = {}) {
        if (!options.uri) {
            throw new Error('"options.uri" must be defined');
        }

        if (!options.name) {
            throw new Error('"options.name" must be defined');
        }

        if (this.resources.has(options.name)) {
            throw new Error(
                `Resource with the name "${options.name}" has already been registered.`
            );
        }

        const validation = joi.validate(options.uri, URI_SCHEMA);
        if (validation.error) {
            throw new Error(
                `The value for "options.uri", ${options.uri}, is not a valid URI`
            );
        }

        const opts = Object.assign({ agent: this.options.agent }, options);
        const resource = new Resource(this.registry, opts);

        this.resources.set(options.name, resource);

        return resource;
    }

    getResource(name) {
        return this.resources.get(name);
    }

    js() {
        return this.registry
            .entries(item => {
                if (item.assets && item.assets.js) {
                    return item.assets.js;
                }
                return undefined;
            })
            .filter(item => item);
    }

    css() {
        return this.registry
            .entries(item => {
                if (item.assets && item.assets.css) {
                    return item.assets.css;
                }
                return undefined;
            })
            .filter(item => item);
    }
};
