/* eslint-disable no-param-reassign */

'use strict';

const { manifest } = require('@podium/schemas');
const CachePolicy = require('http-cache-semantics');
const request = require('request');
const Metrics = require('@metrics/client');
const abslog = require('abslog');
const utils = require('@podium/utils');
const pkg = require('../package.json');

const UA_STRING = `${pkg.name} ${pkg.version}`;

module.exports = class PodletClientManifestResolver {
    #log;
    #agent;
    #metrics;
    #histogram;
    constructor(options = {}) {
        const name = options.clientName;
        this.#log = abslog(options.logger);
        this.#agent = options.agent;
        this.#metrics = new Metrics();
        this.#histogram = this.#metrics.histogram({
            name: 'podium_client_resolver_manifest_resolve',
            description: 'Time taken for success/failure of manifest request',
            labels: {
                name,
                status: null,
                podlet: null,
            },
            buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 10],
        });

        this.#metrics.on('error', error => {
            this.#log.error(
                'Error emitted by metric stream in @podium/client module',
                error,
            );
        });
    }

    get metrics() {
        return this.#metrics;
    }

    resolve(outgoing) {
        return new Promise(resolve => {
            if (outgoing.status === 'cached') {
                resolve(outgoing);
                return;
            }

            const headers = {
                'User-Agent': UA_STRING,
            };

            const reqOptions = {
                timeout: outgoing.timeout,
                method: 'GET',
                agent: this.#agent,
                json: true,
                uri: outgoing.manifestUri,
                headers,
            };

            const timer = this.#histogram.timer({
                labels: {
                    podlet: outgoing.name,
                },
            });

            request(reqOptions, (error, res, body) => {
                this.#log.debug(
                    `start reading manifest from remote resource - resource: ${outgoing.name} - url: ${outgoing.manifestUri}`,
                );

                // Network error or JSON parsing error
                if (error) {
                    timer({
                        labels: {
                            status: 'failure',
                        },
                    });

                    this.#log.warn(
                        `could not create network connection to remote manifest - resource: ${outgoing.name} - url: ${outgoing.manifestUri}`,
                    );
                    resolve(outgoing);
                    return;
                }

                // Remote responds but with an http error code
                const resError = res.statusCode !== 200;
                if (resError) {
                    timer({
                        labels: {
                            status: 'failure',
                        },
                    });

                    this.#log.warn(
                        `remote resource responded with non 200 http status code for manifest - code: ${res.statusCode} - resource: ${outgoing.name} - url: ${outgoing.manifestUri}`,
                    );
                    resolve(outgoing);
                    return;
                }

                const m = manifest(body);

                // Manifest validation error
                if (m.error) {
                    timer({
                        labels: {
                            status: 'failure',
                        },
                    });

                    this.#log.warn(
                        `could not parse manifest - resource: ${outgoing.name} - url: ${outgoing.manifestUri}`,
                    );
                    resolve(outgoing);
                    return;
                }

                // Manifest is valid, calculate maxAge for caching and continue
                timer({
                    labels: {
                        status: 'success',
                    },
                });

                const resValues = {
                    status: res.statusCode,
                    headers: res.headers,
                };

                const cachePolicy = new CachePolicy(reqOptions, resValues, {
                    ignoreCargoCult: true,
                });
                const maxAge = cachePolicy.timeToLive();
                if (maxAge !== 0) {
                    this.#log.debug(
                        `remote resource has cache header which yelds a max age of ${maxAge}ms, using this as cache ttl - resource: ${outgoing.name} - url: ${outgoing.manifestUri}`,
                    );
                    outgoing.maxAge = maxAge;
                }

                // Build absolute content and fallback URIs
                if (m.value.fallback !== '') {
                    m.value.fallback = utils.uriRelativeToAbsolute(
                        m.value.fallback,
                        outgoing.manifestUri,
                    );
                }

                m.value.content = utils.uriRelativeToAbsolute(
                    m.value.content,
                    outgoing.manifestUri,
                );

                // Construct css and js objects with absolute URIs
                m.value.css = m.value.css.map(obj => {
                    obj.value = utils.uriRelativeToAbsolute(
                        obj.value,
                        outgoing.manifestUri,
                    );
                    return new utils.AssetCss(obj);
                });

                m.value.js = m.value.js.map(obj => {
                    obj.value = utils.uriRelativeToAbsolute(
                        obj.value,
                        outgoing.manifestUri,
                    );
                    return new utils.AssetJs(obj);
                });

                // Build absolute proxy URIs
                Object.keys(m.value.proxy).forEach(key => {
                    m.value.proxy[key] = utils.uriRelativeToAbsolute(
                        m.value.proxy[key],
                        outgoing.manifestUri,
                    );
                });

                outgoing.manifest = m.value;
                outgoing.status = 'fresh';

                this.#log.debug(
                    `successfully read manifest from remote resource - resource: ${outgoing.name} - url: ${outgoing.manifestUri}`,
                );
                resolve(outgoing);
            });
        });
    }

    get [Symbol.toStringTag]() {
        return 'PodletClientManifestResolver';
    }
};
