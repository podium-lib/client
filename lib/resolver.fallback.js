'use strict';

const request = require('request');
const abslog = require('abslog');
const Metrics = require('@podium/metrics');
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
    }

    get [Symbol.toStringTag]() {
        return 'PodletClientFallbackResolver';
    }

    resolve(state) {
        return new Promise(resolve => {
            if (state.status === 'cached') {
                resolve(state);
                return;
            }

            // Manifest has no fallback, fetching of manifest likely failed.
            // Its not possible to fetch anything
            // Do not set fallback so we can serve any previous fallback we might have
            if (state.manifest.fallback === undefined) {
                resolve(state);
                return;
            }

            // If manifest fallback is empty, there is no fallback content to fetch
            // Set fallback to empty string
            if (state.manifest.fallback === '') {
                this.log.debug(
                    `no fallback defined in manifest - resource: ${
                        state.resourceName
                    }`
                );
                state.fallback = '';
                resolve(state);
                return;
            }

            // The manifest fallback holds a URI, fetch its content
            const headers = {
                'User-Agent': UA_STRING,
            };

            const reqOptions = {
                timeout: state.timeout,
                method: 'GET',
                agent: this.agent,
                uri: state.fallbackUri,
                headers,
            };

            const timer = this.metrics.timer({
                name: 'podlet_fallback_request',
                description:
                    'Time taken for success/failure of fallback request',
                meta: {
                    url: reqOptions.uri,
                    method: reqOptions.method,
                },
            });

            request(reqOptions, (error, res, body) => {
                this.log.debug(
                    `start reading fallback content from remote resource - resource: ${
                        state.resourceName
                    } - url: ${state.fallbackUri}`
                );

                // Network error
                if (error) {
                    timer({
                        meta: {
                            status: 'failure',
                            code: 'NETWORK_ERROR',
                            statusCode: null,
                        },
                    });

                    this.log.warn(
                        `could not create network connection to remote resource for fallback content - resource: ${
                            state.resourceName
                        } - url: ${state.fallbackUri}`
                    );

                    state.fallback = '';
                    resolve(state);
                    return;
                }

                // Remote responds but with an http error code
                const resError = res.statusCode !== 200;
                if (resError) {
                    timer({
                        meta: {
                            status: 'failure',
                            code: 'HTTP_ERROR',
                            statusCode: res.statusCode,
                        },
                    });

                    this.log.warn(
                        `could not read fallback content from remote resource - resource: ${
                            state.resourceName
                        } - url: ${state.fallbackUri}`
                    );

                    state.fallback = '';
                    resolve(state);
                    return;
                }

                // Response is OK. Store response body as fallback html for caching
                timer({
                    meta: {
                        status: 'success',
                        code: null,
                        statusCode: 200,
                    },
                });

                // Set fallback to the fetched content
                state.fallback = body;

                this.log.debug(
                    `successfully read fallback from remote resource - resource: ${
                        state.resourceName
                    } - url: ${state.fallbackUri}`
                );
                resolve(state);
            });
        });
    }
};
