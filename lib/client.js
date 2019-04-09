/* eslint-disable no-underscore-dangle */
/* eslint-disable import/order no-underscore-dangle */

'use strict';

const EventEmitter = require('events');
const { validate } = require('@podium/schemas');
const Metrics = require('@metrics/client');
const abslog = require('abslog');
const Cache = require('ttl-mem-cache');
const http = require('http');
const util = require('util');

const Resource = require('./resource');
const State = require('./state');
const utils = require('./utils');

const _resources = Symbol('podium:client:resources');
const _registry = Symbol('podium:client:registry');
const _metrics = Symbol('podium:client:metrics');
const _options = Symbol('podium:client:options');
const _state = Symbol('podium:client:state');

const HTTP_AGENT = new http.Agent({
    keepAlive: true,
    maxSockets: 10,
    maxFreeSockets: 10,
    timeout: 60000,
    keepAliveMsecs: 30000,
});

const RETRIES = 4;

const TIMEOUT = 6000; // 6 seconds

const MAX_AGE = Infinity;

const PodiumClient = class PodiumClient extends EventEmitter {
    constructor(options = {}) {
        super();
        const log = abslog(options.logger);

        this[_options] = Object.assign(
            {
                retries: RETRIES,
                timeout: TIMEOUT,
                logger: options.logger,
                maxAge: MAX_AGE,
                agent: HTTP_AGENT,
            },
            options,
        );

        this[_state] = new State({
            resolveThreshold: options.resolveThreshold,
            resolveMax: options.resolveMax,
        });
        this[_state].on('state', (state) => {
            this.emit('state', state);
        });

        this[_resources] = new Map();

        this[_registry] = new Cache({
            changefeed: true,
            ttl: options.maxAge,
        });
        this[_registry].on('error', error => {
            log.error('Error emitted by the registry in @podium/client module', error);
        });

        // TODO; Deprecate the "change" event
        this[_registry].on('set', (key, item) => {
            /* istanbul ignore next */
            if (utils.hasManifestChange(item)) {
                this.emit('change', item.newVal);
            }

            this[_state].setUnstableState();
        });

        // TODO; Deprecate the "dispose" event
        this[_registry].on('dispose', key => {
            this.emit('dispose', key);
        });

        this[_metrics] = new Metrics();
        this[_metrics].on('error', error => {
            log.error('Error emitted by metric stream in @podium/client module', error);
        });

        this[Symbol.iterator] = () => ({
            items: Array.from(this[_resources]).map(item => item[1]),
            next: function next() {
                return {
                    done: this.items.length === 0,
                    value: this.items.shift(),
                };
            },
        });
    }

    get metrics() {
        return this[_metrics];
    }

    get state() {
        return this[_state].status;
    }

    register(options = {}) {
        if (validate.name(options.name).error) throw new Error(
            `The value, "${options.name}", for the required argument "name" on the .register() method is not defined or not valid.`
        );

        if (validate.uriStrict(options.uri).error) throw new Error(
            `The value, "${options.uri}", for the required argument "uri" on the .register() method is not defined or not valid.`
        );

        if (this[_resources].has(options.name)) {
            throw new Error(
                `Resource with the name "${
                    options.name
                }" has already been registered.`,
            );
        }

        const resourceOptions = Object.assign(
            {
                retries: this[_options].retries,
                timeout: this[_options].timeout,
                logger: this[_options].logger,
                maxAge: this[_options].maxAge,
                agent: this[_options].agent,
            },
            options,
        );
        const resource = new Resource(this[_registry], this[_state], resourceOptions);

        resource.metrics.pipe(this[_metrics]);

        Object.defineProperty(this, options.name, {
            get: () => this[_resources].get(options.name),
            set: () => {
                throw new Error('Cannot set read-only property.');
            },
        });

        this[_resources].set(options.name, resource);
        return resource;
    }

    js() {
        return Array.from(this[_resources])
            .map(item => {
                const manifest = this[_registry].get(item[1].name);
                if (manifest && manifest.assets && manifest.assets.js) {
                    return manifest.assets.js;
                }
                return undefined;
            })
            .filter(item => item);
    }

    css() {
        return Array.from(this[_resources])
            .map(item => {
                const manifest = this[_registry].get(item[1].name);
                if (manifest && manifest.assets && manifest.assets.css) {
                    return manifest.assets.css;
                }
                return undefined;
            })
            .filter(item => item);
    }

    dump() {
        return this[_registry].dump();
    }

    load(dump) {
        return this[_registry].load(dump);
    }

    async refreshManifests() {
        const end = this[_metrics].timer({
            name: 'podlet_client_refresh_manifests',
            description: 'Time taken for podlet client to refresh manifests',
        });

        // Don't return this
        await Promise.all(
            Array.from(this[_resources]).map(resource => resource[1].refresh()),
        );
        end();
    }

    get [Symbol.toStringTag]() {
        return 'PodiumClient';
    }

    [util.inspect.custom](depth, options) {
        return util.inspect({
            metrics: this.metrics,
            state: this.state,
        }, depth, options);
    }
};
module.exports = PodiumClient;