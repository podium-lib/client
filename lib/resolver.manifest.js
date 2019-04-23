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
            this.log.error('Error emitted by metric stream in @podium/client module', error);
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
                        outgoing.name
                    } - url: ${outgoing.manifestUri}`,
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
                        meta: {
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
                        meta: {
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
                            outgoing.name
                        } - url: ${outgoing.manifestUri}`,
                    );
                    outgoing.maxAge = maxAge;
                }


//                console.log(manifest.value);
                if (manifest.value.css.length === 0 && manifest.value.assets.css !== '') {
//                    console.log('V3 MANIFEST')
                }



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
                    manifest.value.assets.css = utils.uriRelativeToAbsolute(
                        manifest.value.assets.css,
                        outgoing.manifestUri,
                    );
                }

                if (outgoing.resolveJs) {
                    manifest.value.assets.js = utils.uriRelativeToAbsolute(
                        manifest.value.assets.js,
                        outgoing.manifestUri,
                    );
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
