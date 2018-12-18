'use strict';

const CachePolicy = require('http-cache-semantics');
const request = require('request');
const schemas = require('@podium/schemas');
const Metrics = require('@metrics/client');
const abslog = require('abslog');
const utils = require('@podium/utils');
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
        return new Promise(resolve => {
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

            const timer = this.metrics.timer({
                name: 'podlet_manifest_request',
                description:
                    'Time taken for success/failure of mainfest request',
                meta: {
                    url: reqOptions.uri,
                    method: reqOptions.method,
                },
            });

            request(reqOptions, (error, res, body) => {
                this.log.debug(
                    `start reading manifest from remote resource - resource: ${
                        state.resourceName
                    } - url: ${state.manifestUri}`
                );

                // Network error or JSON parsing error
                if (error) {
                    timer({
                        meta: {
                            status: 'failure',
                            code: 'NETWORK_OR_PARSING_ERROR',
                            statusCode: null,
                        },
                    });

                    this.log.warn(
                        `could not create network connection to remote manifest - resource: ${
                            state.resourceName
                        } - url: ${state.manifestUri}`
                    );
                    resolve(state);
                    return;
                }

                // Remote responds but with an http error code
                const resError = res.statusCode !== 200;
                if (resError) {
                    timer({
                        meta: {
                            status: 'failure',
                            code: 'MANIFEST_UNAVAILABLE',
                            statusCode: res.statusCode,
                        },
                    });

                    this.log.warn(
                        `remote resource responded with non 200 http status code for manifest - code: ${
                            res.statusCode
                        } - resource: ${state.resourceName} - url: ${
                            state.manifestUri
                        }`
                    );
                    resolve(state);
                    return;
                }

                const manifest = Joi.validate(body, schemas.manifest.schema);

                // Manifest validation error
                if (manifest.error) {
                    timer({
                        meta: {
                            status: 'failure',
                            code: 'MANIFEST_VALIDATION_ERROR',
                            statusCode: res.statusCode,
                        },
                    });

                    this.log.warn(
                        `could not parse manifest - resource: ${
                            state.resourceName
                        } - url: ${state.manifestUri}`
                    );
                    resolve(state);
                    return;
                }

                // Manifest is valid, calculate maxAge for caching and continue
                timer({
                    meta: {
                        status: 'success',
                        code: null,
                        statusCode: 200,
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
                    this.log.debug(
                        `remote resource has cache header which yelds a max age of ${maxAge}ms, using this as cache ttl - resource: ${
                            state.resourceName
                        } - url: ${state.manifestUri}`
                    );
                    state.maxAge = maxAge;
                }

                // Build absolute content and fallback URIs
                if (manifest.value.fallback !== '') {
                    manifest.value.fallback = utils.uriRelativeToAbsolute(
                        manifest.value.fallback,
                        state.manifestUri
                    );
                }

                manifest.value.content = utils.uriRelativeToAbsolute(
                    manifest.value.content,
                    state.manifestUri,
                    state.reqOptions.pathname
                );

                // Build absolute css and js URIs if configured to do so
                if (state.resolveCss) {
                    manifest.value.assets.css = utils.uriRelativeToAbsolute(
                        manifest.value.assets.css,
                        state.manifestUri
                    );
                }

                if (state.resolveJs) {
                    manifest.value.assets.js = utils.uriRelativeToAbsolute(
                        manifest.value.assets.js,
                        state.manifestUri
                    );
                }

                // Build absolute proxy URIs
                Object.keys(manifest.value.proxy).forEach(key => {
                    manifest.value.proxy[key] = utils.uriRelativeToAbsolute(
                        manifest.value.proxy[key],
                        state.manifestUri
                    );
                });

                state.manifest = manifest.value;
                state.status = 'fresh';

                this.log.debug(
                    `successfully read manifest from remote resource - resource: ${
                        state.resourceName
                    } - url: ${state.manifestUri}`
                );
                resolve(state);
            });
        });
    }
};
