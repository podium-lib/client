'use strict';

const request = require('request');
const abslog = require('abslog');
const Metrics = require('@podium/metrics');
const boom = require('boom');
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
        return new Promise((resolve, reject) => {
            if (state.status === 'cached') {
                resolve(state);
                return;
            }

            // Manifest has no fallback, fetching of manifest likely failed.
            // Its not possible to fetch anything
            if (state.manifest.fallback === undefined) {
                resolve(state);
                return;
            }

            // If manifest fallback is empty, there is no fallback content to fetch
            if (state.manifest.fallback === '') {
                this.log.debug(
                    'no fallback defined in manifest',
                    state.manifestUri
                );
                state.status = 'fresh';
                resolve(state);
                return;
            }

            const successTimer = this.metrics.timer({
                name: 'fallback_request_success',
                description: 'Time taken for successful fallback request',
                layout: this.options.layout,
                podlet: this.options.name,
            });

            const failureTimer = this.metrics.timer({
                name: 'fallback_request_failure',
                description: 'Time taken for failing fallback request',
                layout: this.options.layout,
                podlet: this.options.name,
            });

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

            request(reqOptions, (error, res, body) => {
                this.log.debug(
                    'start reading fallback content from remote resource',
                    state.fallbackUri
                );

                // Network error
                if (error && state.throwable) {
                    failureTimer();

                    this.log.warn(
                        'could not create network connection to remote resource for fallback content',
                        state.fallbackUri
                    );
                    reject(
                        boom.badGateway(
                            `Error reading fallback at ${state.fallbackUri}`,
                            error
                        )
                    );
                    return;
                } else if (error) {
                    failureTimer();

                    this.log.warn(
                        'could not create network connection to remote resource for fallback content',
                        state.fallbackUri
                    );
                    resolve(state);
                    return;
                }

                // Remote responds but with an http error code
                const resError = res.statusCode !== 200;
                if (resError && state.throwable) {
                    failureTimer();

                    this.log.warn(
                        'could not read fallback content from remote resource',
                        state.fallbackUri
                    );
                    reject(
                        boom.badGateway(
                            `Could not read fallback. Resource responded with ${
                                res.statusCode
                            } on ${state.fallbackUri}`
                        )
                    );
                    return;
                } else if (resError) {
                    failureTimer();

                    this.log.warn(
                        'could not read fallback content from remote resource',
                        state.fallbackUri
                    );
                    resolve(state);
                    return;
                }

                // Response is OK. Store response body as fallback html for caching
                successTimer();

                state.fallback = body;
                state.status = 'fresh';
                this.log.debug(
                    'successfully read fallback from remote resource',
                    state.fallbackUri
                );
                resolve(state);
            });
        });
    }
};
