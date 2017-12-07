'use strict';

const EventEmitter = require('events');
const Resource = require('./resource');
const Cache = require('ttl-mem-cache');
const utils = require('./utils');
const http = require('http');
const joi = require('joi');

const URI_SCHEMA = joi
    .string()
    .uri()
    .trim()
    .required();

const NAME_SCHEMA = joi
    .string()
    .regex(/^[a-zA-Z]{2,100}$/)
    .trim()
    .required();

const HTTP_AGENT = new http.Agent({
    keepAlive: true,
    maxSockets: 10,
    maxFreeSockets: 10,
    timeout: 60000,
    keepAliveMsecs: 30000,
});

const TIMEOUT = 1000; // 1 second

// const MAX_AGE = Infinity; // There is a bug making Infinity not work in underlaying cache
const MAX_AGE = 24 * 60 * 60 * 1000;

module.exports = class PodletClient extends EventEmitter {
    constructor(options = {}) {
        super();
        Object.defineProperty(this, 'options', {
            value: Object.assign(
                {
                    timeout: TIMEOUT,
                    logger: options.logger,
                    maxAge: MAX_AGE,
                    agent: HTTP_AGENT,
                },
                options
            ),
        });

        Object.defineProperty(this, 'registry', {
            value: new Cache({
                changefeed: true,
            }),
        });

        this.registry.on('set', item => {
            if (utils.hasManifestChange(item)) {
                this.emit('change', item.value.newVal);
            }
        });

        this.registry.on('dispose', key => {
            this.emit('dispose', key);
        });

        this._resources = new Map();

        this[Symbol.iterator] = () => ({
            items: Array.from(this._resources).map(item => item[1]),
            next: function next() {
                return {
                    done: this.items.length === 0,
                    value: this.items.shift(),
                };
            },
        });
    }

    get [Symbol.toStringTag]() {
        return 'PodletClient';
    }

    register(options = {}) {
        const validatedUri = joi.validate(options.uri, URI_SCHEMA);
        if (validatedUri.error) {
            throw new Error(
                `The value for "options.uri", ${
                    options.uri
                }, is not a valid URI`
            );
        }

        const validatedName = joi.validate(options.name, NAME_SCHEMA);
        if (validatedName.error) {
            throw new Error(
                `The value for "options.name", ${
                    options.name
                }, is not a valid name`
            );
        }

        if (this._resources.has(options.name)) {
            throw new Error(
                `Resource with the name "${
                    options.name
                }" has already been registered.`
            );
        }

        const resourceOptions = Object.assign(
            {
                timeout: this.options.timeout,
                logger: this.options.logger,
                maxAge: this.options.maxAge,
                agent: this.options.agent,
            },
            options
        );
        const resource = new Resource(this.registry, resourceOptions);

        Object.defineProperty(this, options.name, {
            get: () => this._resources.get(options.name),
            set: () => {
                throw new Error('Cannot set read-only property.');
            },
        });

        this._resources.set(options.name, resource);
        return resource;
    }

    js() {
        return Array.from(this._resources)
            .map(item => {
                const manifest = this.registry.get(item[1].uri);
                if (manifest && manifest.assets && manifest.assets.js) {
                    return manifest.assets.js;
                }
                return undefined;
            })
            .filter(item => item);
    }

    css() {
        return Array.from(this._resources)
            .map(item => {
                const manifest = this.registry.get(item[1].uri);
                if (manifest && manifest.assets && manifest.assets.css) {
                    return manifest.assets.css;
                }
                return undefined;
            })
            .filter(item => item);
    }

    dump() {
        return this.registry.dump();
    }

    load(dump) {
        return this.registry.load(dump);
    }

    async refreshManifests() {
        // Don't return this
        await Promise.all(
            Array.from(this._resources).map(resource => resource[1].fetch({}))
        );
    }
};
