/* eslint-disable import/order */
/* eslint-disable no-underscore-dangle */
/* eslint-disable prefer-spread */

'use strict';

const EventEmitter = require('events');
const { validate } = require('@podium/schemas');
const Metrics = require('@metrics/client');
const abslog = require('abslog');
const Cache = require('ttl-mem-cache');
const http = require('http');
const https = require('https');
const util = require('util');

const Resource = require('./resource');
const State = require('./state');
const utils = require('./utils');

const _resources = Symbol('podium:client:resources');
const _registry = Symbol('podium:client:registry');
const _metrics = Symbol('podium:client:metrics');
const _histogram = Symbol('podium:client:metrics:histogram');
const _options = Symbol('podium:client:options');
const _state = Symbol('podium:client:state');

const HTTP_AGENT_OPTIONS = {
    keepAlive: true,
    maxSockets: 10,
    maxFreeSockets: 10,
    timeout: 60000,
    keepAliveMsecs: 30000,
};

const HTTPS_AGENT_OPTIONS = {
    ...HTTP_AGENT_OPTIONS,
    maxCachedSessions: 10,
};

const HTTP_AGENT = new http.Agent(HTTP_AGENT_OPTIONS);

const HTTPS_AGENT = new https.Agent(HTTPS_AGENT_OPTIONS);

const RETRIES = 4;

const TIMEOUT = 1000; // 1 seconds

const MAX_AGE = Infinity;

function cssDeprecated() {
    if (!cssDeprecated.warned) {
        cssDeprecated.warned = true;
        process.emitWarning(
            'The client.css() method is deprecated. Use the .css property on the response object of each podlet instead. For further information, please see: https://podium-lib.io/blog/2019/06/14/version-4.0.0#the-fetch-method-now-resolves-with-a-response-object',
            'DeprecationWarning',
        );
    }
}

function jsDeprecated() {
    if (!jsDeprecated.warned) {
        jsDeprecated.warned = true;
        process.emitWarning(
            'The client.js() method is deprecated. Use the .js property on the response object of each podlet instead. For further information, please see: https://podium-lib.io/blog/2019/06/14/version-4.0.0#the-fetch-method-now-resolves-with-a-response-object',
            'DeprecationWarning',
        );
    }
}

const PodiumClient = class PodiumClient extends EventEmitter {
    constructor(options = {}) {
        super();
        const log = abslog(options.logger);

        if (validate.name(options.name).error) {
            throw new Error(
                `The value, "${options.name}", for the required argument "name" on the Client constructor is not defined or not valid.`,
            );
        }

        this[_options] = {
            name: '',
            retries: RETRIES,
            timeout: TIMEOUT,
            logger: options.logger,
            maxAge: MAX_AGE,
            httpAgent: HTTP_AGENT,
            httpsAgent: HTTPS_AGENT,
            ...options,
        };

        this[_state] = new State({
            resolveThreshold: options.resolveThreshold,
            resolveMax: options.resolveMax,
        });
        this[_state].on('state', state => {
            this.emit('state', state);
        });

        this[_resources] = new Map();

        this[_registry] = new Cache({
            changefeed: true,
            ttl: options.maxAge,
        });
        this[_registry].on('error', error => {
            log.error(
                'Error emitted by the registry in @podium/client module',
                error,
            );
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
            log.error(
                'Error emitted by metric stream in @podium/client module',
                error,
            );
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

        this[_histogram] = this[_metrics].histogram({
            name: 'podium_client_refresh_manifests',
            description: 'Time taken for podium client to refresh manifests',
            labels: { name: this[_options].name },
            buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 10],
        });
    }

    get registry() {
        return this[_registry];
    }

    get metrics() {
        return this[_metrics];
    }

    get state() {
        return this[_state].status;
    }

    register(options = {}) {
        if (validate.name(options.name).error)
            throw new Error(
                `The value, "${options.name}", for the required argument "name" on the .register() method is not defined or not valid.`,
            );

        if (validate.uriStrict(options.uri).error)
            throw new Error(
                `The value, "${options.uri}", for the required argument "uri" on the .register() method is not defined or not valid.`,
            );

        if (this[_resources].has(options.name)) {
            throw new Error(
                `Resource with the name "${options.name}" has already been registered.`,
            );
        }

        const resourceOptions = {
            clientName: this[_options].name,
            retries: this[_options].retries,
            timeout: this[_options].timeout,
            logger: this[_options].logger,
            maxAge: this[_options].maxAge,
            agent: options.uri.startsWith('https://')
                ? this[_options].httpsAgent
                : this[_options].httpAgent,
            ...options,
        };
        const resource = new Resource(
            this[_registry],
            this[_state],
            resourceOptions,
        );

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
        jsDeprecated();

        return [].concat.apply(
            [],
            Array.from(this[_resources])
                .map(item => {
                    const manifest = this[_registry].get(item[1].name);
                    if (manifest && manifest.assets) {
                        return manifest.assets.js;
                    }
                    return undefined;
                })
                .filter(item => item),
        );
    }

    css() {
        cssDeprecated();

        return [].concat.apply(
            [],
            Array.from(this[_resources])
                .map(item => {
                    const manifest = this[_registry].get(item[1].name);
                    if (manifest && manifest.assets) {
                        return manifest.assets.css;
                    }
                    return undefined;
                })
                .filter(item => item),
        );
    }

    dump() {
        return this[_registry].dump();
    }

    load(dump) {
        return this[_registry].load(dump);
    }

    async refreshManifests() {
        const end = this[_histogram].timer();

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
        return util.inspect(
            {
                metrics: this.metrics,
                state: this.state,
            },
            depth,
            options,
        );
    }
};
module.exports = PodiumClient;
