/* eslint-disable no-param-reassign */

'use strict';

const { validate } = require('@podium/schemas');
const CachePolicy = require('http-cache-semantics');
const request = require('request');
const Metrics = require('@metrics/client');
const abslog = require('abslog');
const utils = require('@podium/utils');
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

        this.metrics.on('error', error => {
            this.log.error(
                'Error emitted by metric stream in @podium/client module',
                error,
            );
        });
    }

    get [Symbol.toStringTag]() {
        return 'PodletClientManifestResolver';
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
                agent: this.agent,
                json: true,
                uri: outgoing.manifestUri,
                headers,
            };

            const histogram = this.metrics.histogram({
                name: 'podium_client_resolver_manifest_resolve',
                description:
                    'Time taken for success/failure of manifest request',
                labels: {
                    url: outgoing.manifestUri,
                    method: 'GET',
                    status: null,
                    code: null,
                    statusCode: null,
                    podlet: outgoing.name,
                },
            });
            const timer = histogram.timer();

            request(reqOptions, (error, res, body) => {
                this.log.debug(
                    `start reading manifest from remote resource - resource: ${
                        outgoing.name
                    } - url: ${outgoing.manifestUri}`,
                );

                // Network error or JSON parsing error
                if (error) {
                    timer({
                        labels: {
                            status: 'failure',
                            code: 'NETWORK_OR_PARSING_ERROR',
                            statusCode: null,
                        },
                    });

                    this.log.warn(
                        `could not create network connection to remote manifest - resource: ${
                            outgoing.name
                        } - url: ${outgoing.manifestUri}`,
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
                            code: 'MANIFEST_UNAVAILABLE',
                            statusCode: res.statusCode,
                        },
                    });

                    this.log.warn(
                        `remote resource responded with non 200 http status code for manifest - code: ${
                            res.statusCode
                        } - resource: ${outgoing.name} - url: ${
                            outgoing.manifestUri
                        }`,
                    );
                    resolve(outgoing);
                    return;
                }

                const manifest = validate.manifest(body);

                // Manifest validation error
                if (manifest.error) {
                    timer({
                        labels: {
                            status: 'failure',
                            code: 'MANIFEST_VALIDATION_ERROR',
                            statusCode: res.statusCode,
                        },
                    });

                    this.log.warn(
                        `could not parse manifest - resource: ${
                            outgoing.name
                        } - url: ${outgoing.manifestUri}`,
                    );
                    resolve(outgoing);
                    return;
                }

                // Manifest is valid, calculate maxAge for caching and continue
                timer({
                    labels: {
                        status: 'success',
                        code: 'FETCHED',
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
                            outgoing.name
                        } - url: ${outgoing.manifestUri}`,
                    );
                    outgoing.maxAge = maxAge;
                }

                // START: Maintain backwards compabillity to V3 manifests
                // Potentially a V3 manifest
                if (manifest.value.assets) {
                    // .assets.js has a value but .js does not. Replicate the value to .js
                    if (
                        Array.isArray(manifest.value.js) &&
                        manifest.value.js.length === 0 &&
                        manifest.value.assets.js !== ''
                    ) {
                        manifest.value.js.push({
                            value: manifest.value.assets.js,
                            type: 'module',
                        });
                    }

                    // .assets.css has a value but .css does not. Replicate the value to .css
                    if (
                        Array.isArray(manifest.value.css) &&
                        manifest.value.css.length === 0 &&
                        manifest.value.assets.css !== ''
                    ) {
                        manifest.value.css.push({
                            value: manifest.value.assets.css,
                            type: 'module',
                        });
                    }
                }
                // END: Maintain backwards compabillity to V3 manifests

                // Build absolute content and fallback URIs
                if (manifest.value.fallback !== '') {
                    manifest.value.fallback = utils.uriRelativeToAbsolute(
                        manifest.value.fallback,
                        outgoing.manifestUri,
                    );
                }

                manifest.value.content = utils.uriRelativeToAbsolute(
                    manifest.value.content,
                    outgoing.manifestUri,
                    outgoing.reqOptions.pathname,
                );

                // Build absolute css and js URIs if configured to do so
                if (outgoing.resolveCss) {
                    manifest.value.css.forEach(obj => {
                        obj.value = utils.uriRelativeToAbsolute(
                            obj.value,
                            outgoing.manifestUri,
                        );
                    });

                    // START: Maintain backwards compabillity to V3 manifests
                    manifest.value.assets.css = utils.uriRelativeToAbsolute(
                        manifest.value.assets.css,
                        outgoing.manifestUri,
                    );
                    // END: Maintain backwards compabillity to V3 manifests
                }

                if (outgoing.resolveJs) {
                    manifest.value.js.forEach(obj => {
                        obj.value = utils.uriRelativeToAbsolute(
                            obj.value,
                            outgoing.manifestUri,
                        );
                    });

                    // START: Maintain backwards compabillity to V3 manifests
                    manifest.value.assets.js = utils.uriRelativeToAbsolute(
                        manifest.value.assets.js,
                        outgoing.manifestUri,
                    );
                    // END: Maintain backwards compabillity to V3 manifests
                }

                // Build absolute proxy URIs
                Object.keys(manifest.value.proxy).forEach(key => {
                    manifest.value.proxy[key] = utils.uriRelativeToAbsolute(
                        manifest.value.proxy[key],
                        outgoing.manifestUri,
                    );
                });

                outgoing.manifest = manifest.value;
                outgoing.status = 'fresh';

                this.log.debug(
                    `successfully read manifest from remote resource - resource: ${
                        outgoing.name
                    } - url: ${outgoing.manifestUri}`,
                );
                resolve(outgoing);
            });
        });
    }
};
