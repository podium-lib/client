'use strict';

const EventEmitter = require('events');
const Resource = require('./resource');
const LRU = require('lru-cache');
const joi = require('joi');

const URI_SCHEMA = joi.string().uri();


module.exports = class PodiumClient extends EventEmitter {
    constructor(options = {
        cacheSize: 20
    }) {
        super();
        this.registry = LRU({
            max: options.cacheSize
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

        return new Resource(this.registry, options);
    }
};
