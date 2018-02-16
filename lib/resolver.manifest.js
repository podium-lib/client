'use strict';

const CachePolicy = require('http-cache-semantics');
const request = require('request');
const schemas = require('@podium/schemas');
const Metrics = require('@podium/metrics');
const abslog = require('abslog');
const utils = require('@podium/utils');
const boom = require('boom');
const Joi = require('joi');
const pkg = require('../package.json');

const UA_STRING = `${pkg.name} ${pkg.version}`;

module.exports = class PodletClientManifestResolver {
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
        return 'PodletClientManifestResolver';
    }

    resolve(state) {
        return new Promise((resolve, reject) => {
            if (state.status === 'cached') {
                resolve(state);
                return;
            }

            const headers = {
                'User-Agent': UA_STRING,
            };

            const reqOptions = {
                timeout: state.timeout,
                method: 'GET',
                agent: this.agent,
                json: true,
                uri: state.manifestUri,
                headers,
            };

            const successTimer = this.metrics.timer({
                name: 'manifest_request_success',
                description: 'Time taken for successful mainfest request',
                url: reqOptions.uri,
                method: reqOptions.method,
            });

            const failureTimer = this.metrics.timer({
                name: 'manifest_request_failure',
                description: 'Time taken for failing manifest request',
                url: reqOptions.uri,
                method: reqOptions.method,
            });

            request(reqOptions, (error, res, body) => {
                this.log.debug(
                    'start reading manifest from remote resource',
                    state.manifestUri
                );

                // Network error or JSON parsing error
                if (error && state.throwable) {
                    failureTimer();

                    this.log.warn(
                        'could not create network connection to remote resource for manifest',
                        state.manifestUri
                    );
                    reject(
                        boom.badGateway(
                            `Error reading manifest at ${state.manifestUri}`,
                            error
                        )
                    );
                    return;
                } else if (error) {
                    failureTimer();

                    this.log.warn(
                        'could not create network connection to remote resource for manifest',
                        state.manifestUri
                    );
                    resolve(state);
                    return;
                }

                // Remote responds but with an http error code
                const resError = res.statusCode !== 200;
                if (resError && state.throwable) {
                    failureTimer({ status: res.statusCode });

                    this.log.warn(
                        'could not read manifest from remote resource',
                        state.manifestUri
                    );
                    reject(
                        boom.badGateway(
                            `Could not read manifest. Resource responded with ${
                                res.statusCode
                            } on ${state.manifestUri}`
                        )
                    );
                    return;
                } else if (resError) {
                    failureTimer({ status: res.statusCode });

                    this.log.warn(
                        'could not read manifest from remote resource',
                        state.manifestUri
                    );
                    resolve(state);
                    return;
                }

                const manifest = Joi.validate(body, schemas.manifest.schema);

                // Manifest validation error
                if (manifest.error && state.throwable) {
                    failureTimer({ status: res.statusCode });

                    this.log.warn(
                        'could not parse manifest from remote resource',
                        state.manifestUri
                    );
                    reject(
                        boom.boomify(
                            manifest.error,
                            502,
                            `Error validating manifest from ${
                                state.manifestUri
                            }`
                        )
                    );
                    return;
                } else if (manifest.error) {
                    failureTimer({ status: res.statusCode });

                    this.log.warn(
                        'could not parse manifest from remote resource',
                        state.manifestUri
                    );
                    resolve(state);
                    return;
                }

                // Manifest is valid, calculate maxAge for caching and continue
                successTimer({ status: res.statusCode });

                const resValues = {
                    status: res.statusCode,
                    headers: res.headers,
                };

                const cachePolicy = new CachePolicy(reqOptions, resValues, {
                    ignoreCargoCult: true,
                });
                const maxAge = cachePolicy.timeToLive();
                if (maxAge !== 0) {
                    this.log.debug(
                        `remote resource has cache header which yelds a max age of ${maxAge}ms`,
                        state.manifestUri
                    );
                    state.maxAge = maxAge;
                }

                // Build absolute content and fallback URIs
                manifest.value.fallback = utils.uriRelativeToAbsolute(
                    manifest.value.fallback,
                    state.manifestUri
                );
                manifest.value.content = utils.uriRelativeToAbsolute(
                    manifest.value.content,
                    state.manifestUri,
                    state.reqOptions.pathname
                );

                state.manifest = manifest.value;
                state.status = 'fresh';

                this.log.debug(
                    'successfully read manifest from remote resource',
                    state.manifestUri
                );
                resolve(state);
            });
        });
    }
};
