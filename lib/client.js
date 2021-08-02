import EventEmitter from 'events';
import * as schemas from '@podium/schemas';
import Metrics from '@metrics/client';
import abslog from 'abslog';
import Cache from 'ttl-mem-cache';
import http from 'http';
import https from 'https';

import Resource from './resource.js';
import State from './state.js';

const inspect = Symbol.for('nodejs.util.inspect.custom');

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

const REJECT_UNAUTHORIZED = true;

const HTTP_AGENT = new http.Agent(HTTP_AGENT_OPTIONS);

const HTTPS_AGENT = new https.Agent(HTTPS_AGENT_OPTIONS);

const RETRIES = 4;

const TIMEOUT = 1000; // 1 seconds

const MAX_AGE = Infinity;

export default class PodiumClient extends EventEmitter {
    #resources;
    #registry;
    #metrics;
    #histogram;
    #options;
    #state;
    constructor(options = {}) {
        super();
        const log = abslog(options.logger);

        if (schemas.name(options.name).error) {
            throw new Error(
                `The value, "${options.name}", for the required argument "name" on the Client constructor is not defined or not valid.`,
            );
        }

        this.#options = {
            name: '',
            retries: RETRIES,
            timeout: TIMEOUT,
            logger: options.logger,
            maxAge: MAX_AGE,
            rejectUnauthorized: REJECT_UNAUTHORIZED,
            httpAgent: HTTP_AGENT,
            httpsAgent: HTTPS_AGENT,
            ...options,
        };

        this.#state = new State({
            resolveThreshold: options.resolveThreshold,
            resolveMax: options.resolveMax,
        });
        this.#state.on('state', state => {
            this.emit('state', state);
        });

        this.#resources = new Map();

        this.#registry = new Cache({
            changefeed: true,
            ttl: options.maxAge,
        });
        this.#registry.on('error', error => {
            log.error(
                'Error emitted by the registry in @podium/client module',
                error,
            );
        });

        this.#registry.on('set', () => {
            this.#state.setUnstableState();
        });

        this.#metrics = new Metrics();
        this.#metrics.on('error', error => {
            log.error(
                'Error emitted by metric stream in @podium/client module',
                error,
            );
        });

        this[Symbol.iterator] = () => ({
            items: Array.from(this.#resources).map(item => item[1]),
            next: function next() {
                return {
                    done: this.items.length === 0,
                    value: this.items.shift(),
                };
            },
        });

        this.#histogram = this.#metrics.histogram({
            name: 'podium_client_refresh_manifests',
            description: 'Time taken for podium client to refresh manifests',
            labels: { name: this.#options.name },
            buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 10],
        });
    }

    get registry() {
        return this.#registry;
    }

    get metrics() {
        return this.#metrics;
    }

    get state() {
        return this.#state.status;
    }

    register(options = {}) {
        if (schemas.name(options.name).error)
            throw new Error(
                `The value, "${options.name}", for the required argument "name" on the .register() method is not defined or not valid.`,
            );

        if (schemas.uriStrict(options.uri).error)
            throw new Error(
                `The value, "${options.uri}", for the required argument "uri" on the .register() method is not defined or not valid.`,
            );

        if (this.#resources.has(options.name)) {
            throw new Error(
                `Resource with the name "${options.name}" has already been registered.`,
            );
        }

        const resourceOptions = {
            rejectUnauthorized: this[_options].rejectUnauthorized,
            clientName: this[_options].name,
            retries: this[_options].retries,
            timeout: this[_options].timeout,
            logger: this[_options].logger,
            maxAge: this[_options].maxAge,
            httpsAgent: this[_options].httpsAgent,
            httpAgent: this[_options].httpAgent,
            ...options,
        };
        const resource = new Resource(
            this.#registry,
            this.#state,
            resourceOptions,
        );

        resource.metrics.pipe(this.#metrics);

        Object.defineProperty(this, options.name, {
            get: () => this.#resources.get(options.name),
            set: () => {
                throw new Error('Cannot set read-only property.');
            },
        });

        this.#resources.set(options.name, resource);
        return resource;
    }

    dump() {
        return this.#registry.dump();
    }

    load(dump) {
        return this.#registry.load(dump);
    }

    async refreshManifests() {
        const end = this.#histogram.timer();

        // Don't return this
        await Promise.all(
            Array.from(this.#resources).map(resource => resource[1].refresh()),
        );

        end();
    }

    [inspect]() {
        return {
            metrics: this.metrics,
            state: this.state,
        };
    }

    get [Symbol.toStringTag]() {
        return 'PodiumClient';
    }
};
