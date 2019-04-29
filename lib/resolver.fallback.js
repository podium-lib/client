/* eslint-disable no-param-reassign */

'use strict';

const request = require('request');
const abslog = require('abslog');
const Metrics = require('@metrics/client');
const pkg = require('../package.json');

const UA_STRING = `${pkg.name} ${pkg.version}`;

module.exports = class PodletClientFallbackResolver {
    constructor(options = {}) {
        Object.defineProperty(this, 'log', {
            value: abslog(options.logger),
        });

        Object.defineProperty(this, 'metrics', {
            enumerable: true,
            value: new Metrics(),
        });

        Object.defineProperty(this, 'agent', {
            value: options.agent,
        });

        this.metrics.on('error', error => {
            this.log.error(
                'Error emitted by metric stream in @podium/client module',
                error,
            );
        });
    }

    get [Symbol.toStringTag]() {
        return 'PodletClientFallbackResolver';
    }

    resolve(outgoing) {
        return new Promise(resolve => {
            const histogram = this.metrics.histogram({
                name: 'podium_client_resolver_fallback_resolve',
                description:
                    'Time taken for success/failure of fallback request',
                labels: {
                    url: outgoing.fallbackUri,
                    method: 'GET',
                    status: null,
                    code: null,
                    statusCode: null,
                    podlet: outgoing.name,
                },
            });
            const timer = histogram.timer();

            if (outgoing.status === 'cached') {
                timer({
                    labels: {
                        status: 'success',
                        code: 'CACHED',
                    },
                });
                resolve(outgoing);
                return;
            }

            // Manifest has no fallback, fetching of manifest likely failed.
            // Its not possible to fetch anything
            // Do not set fallback so we can serve any previous fallback we might have
            if (outgoing.manifest.fallback === undefined) {
                timer({
                    labels: {
                        status: 'failure',
                        code: 'UNKNOWN_ERROR',
                    },
                });
                resolve(outgoing);
                return;
            }

            // If manifest fallback is empty, there is no fallback content to fetch
            // Set fallback to empty string
            if (outgoing.manifest.fallback === '') {
                this.log.debug(
                    `no fallback defined in manifest - resource: ${
                        outgoing.name
                    }`,
                );
                outgoing.fallback = '';
                timer({
                    labels: {
                        status: 'success',
                        code: 'NOT_DEFINED',
                    },
                });
                resolve(outgoing);
                return;
            }

            // The manifest fallback holds a URI, fetch its content
            const headers = {
                'User-Agent': UA_STRING,
            };

            const reqOptions = {
                timeout: outgoing.timeout,
                method: 'GET',
                agent: this.agent,
                uri: outgoing.fallbackUri,
                headers,
            };

            request(reqOptions, (error, res, body) => {
                this.log.debug(
                    `start reading fallback content from remote resource - resource: ${
                        outgoing.name
                    } - url: ${outgoing.fallbackUri}`,
                );

                // Network error
                if (error) {
                    timer({
                        labels: {
                            status: 'failure',
                            code: 'NETWORK_ERROR',
                        },
                    });

                    this.log.warn(
                        `could not create network connection to remote resource for fallback content - resource: ${
                            outgoing.name
                        } - url: ${outgoing.fallbackUri}`,
                    );

                    outgoing.fallback = '';
                    resolve(outgoing);
                    return;
                }

                // Remote responds but with an http error code
                const resError = res.statusCode !== 200;
                if (resError) {
                    timer({
                        labels: {
                            status: 'failure',
                            statusCode: res.statusCode,
                            code: 'HTTP_ERROR',
                        },
                    });

                    this.log.warn(
                        `remote resource responded with non 200 http status code for fallback content - code: ${
                            res.statusCode
                        } - resource: ${outgoing.name} - url: ${
                            outgoing.fallbackUri
                        }`,
                    );

                    outgoing.fallback = '';
                    resolve(outgoing);
                    return;
                }

                // Response is OK. Store response body as fallback html for caching
                timer({
                    labels: {
                        status: 'success',
                        statusCode: res.statusCode,
                        code: 'FETCHED',
                    },
                });

                // Set fallback to the fetched content
                outgoing.fallback = body;

                this.log.debug(
                    `successfully read fallback from remote resource - resource: ${
                        outgoing.name
                    } - url: ${outgoing.fallbackUri}`,
                );
                resolve(outgoing);
            });
        });
    }
};
