/* eslint-disable no-param-reassign */

'use strict';

const { pipeline } = require('readable-stream');
const Metrics = require('@metrics/client');
const request = require('request');
const abslog = require('abslog');
const putils = require('@podium/utils');
const boom = require('@hapi/boom');
const Response = require('./response');
const utils = require('./utils');
const pkg = require('../package.json');

const UA_STRING = `${pkg.name} ${pkg.version}`;

module.exports = class PodletClientContentResolver {
    constructor(options = {}) {
        Object.defineProperty(this, 'log', {
            value: abslog(options.logger),
        });

        Object.defineProperty(this, 'clientName', {
            enumerable: false,
            value: options.clientName,
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
        return 'PodletClientContentResolver';
    }

    resolve(outgoing) {
        return new Promise((resolve, reject) => {
            if (outgoing.kill && outgoing.throwable) {
                this.log.warn(
                    `recursion detected - failed to resolve fetching of podlet ${outgoing.recursions} times - throwing - resource: ${outgoing.name} - url: ${outgoing.manifestUri}`,
                );
                reject(
                    boom.badGateway(
                        `Recursion detected - failed to resolve fetching of podlet ${outgoing.recursions} times`,
                    ),
                );
                return;
            }

            if (outgoing.kill) {
                this.log.warn(
                    `recursion detected - failed to resolve fetching of podlet ${outgoing.recursions} times - serving fallback - resource: ${outgoing.name} - url: ${outgoing.manifestUri}`,
                );
                outgoing.success = true;
                outgoing.pushFallback();
                resolve(outgoing);
                return;
            }

            if (outgoing.status === 'empty' && outgoing.throwable) {
                this.log.warn(
                    `no manifest available - cannot read content - throwing - resource: ${outgoing.name} - url: ${outgoing.manifestUri}`,
                );
                reject(
                    boom.badGateway(
                        `No manifest available - Cannot read content`,
                    ),
                );
                return;
            }

            if (outgoing.status === 'empty') {
                this.log.warn(
                    `no manifest available - cannot read content - serving fallback - resource: ${outgoing.name} - url: ${outgoing.manifestUri}`,
                );
                outgoing.success = true;
                outgoing.pushFallback();
                resolve(outgoing);
                return;
            }

            const headers = {
                ...outgoing.reqOptions.headers,
                'User-Agent': UA_STRING,
            };

            putils.serializeContext(headers, outgoing.context, outgoing.name);

            const reqOptions = {
                timeout: outgoing.timeout,
                method: 'GET',
                agent: this.agent,
                uri: putils.uriBuilder(
                    outgoing.reqOptions.pathname,
                    outgoing.contentUri,
                ),
                qs: outgoing.reqOptions.query,
                headers,
            };

            const histogram = this.metrics.histogram({
                name: 'podium_client_resolver_content_resolve',
                description:
                    'Time taken for success/failure of content request',
                labels: {
                    name: this.clientName,
                    url: outgoing.contentUri,
                    method: 'GET',
                    status: null,
                    code: null,
                    statusCode: null,
                    podlet: outgoing.name,
                },
            });
            const timer = histogram.timer();

            this.log.debug(
                `start reading content from remote resource - manifest version is ${outgoing.manifest.version} - resource: ${outgoing.name} - url: ${outgoing.contentUri}`,
            );

            const r = request(reqOptions);

            r.on('response', response => {
                // Remote responds but with an http error code
                const resError = response.statusCode !== 200;
                if (resError && outgoing.throwable) {
                    timer({
                        labels: {
                            status: 'failure',
                            code: 'HTTP_ERROR',
                            statusCode: response.statusCode,
                        },
                    });

                    this.log.warn(
                        `remote resource responded with non 200 http status code for content - code: ${response.statusCode} - resource: ${outgoing.name} - url: ${outgoing.contentUri}`,
                    );

                    reject(
                        boom.boomify(
                            new Error(
                                `Could not read content. Resource responded with ${response.statusCode} on ${outgoing.contentUri}`,
                            ),
                            {
                                statusCode: response.statusCode,
                            },
                        ),
                    );
                    return;
                }
                if (resError) {
                    timer({
                        labels: {
                            status: 'failure',
                            code: 'HTTP_ERROR',
                            statusCode: response.statusCode,
                        },
                    });

                    this.log.warn(
                        `remote resource responded with non 200 http status code for content - code: ${response.statusCode} - resource: ${outgoing.name} - url: ${outgoing.contentUri}`,
                    );
                    outgoing.success = true;
                    outgoing.pushFallback();
                    resolve(outgoing);
                    return;
                }

                const contentVersion = utils.isHeaderDefined(
                    response.headers,
                    'podlet-version',
                )
                    ? response.headers['podlet-version']
                    : undefined;

                this.log.debug(
                    `got head response from remote resource for content - header version is ${response.headers['podlet-version']} - resource: ${outgoing.name} - url: ${outgoing.contentUri}`,
                );

                if (
                    contentVersion !== outgoing.manifest.version &&
                    contentVersion !== undefined
                ) {
                    timer({
                        labels: {
                            status: 'success',
                            code: 'STALE',
                            statusCode: 200,
                        },
                    });

                    this.log.info(
                        `podlet version number in header differs from cached version number - aborting request to remote resource for content - resource: ${outgoing.name} - url: ${outgoing.contentUri}`,
                    );
                    r.abort();
                    outgoing.status = 'stale';
                    return;
                }

                outgoing.success = true;
                outgoing.headers = response.headers;

                outgoing.emit(
                    'beforeStream',
                    new Response({
                        headers: outgoing.headers,
                        js: outgoing.manifest.js,
                        css: outgoing.manifest.css,
                    }),
                );

                pipeline(r, outgoing, err => {
                    if (err) {
                        this.log.warn('error while piping content stream', err);
                    }
                });
            });

            r.on('error', error => {
                // Network error
                if (outgoing.throwable) {
                    timer({
                        labels: {
                            status: 'failure',
                            code: 'NETWORK_ERROR',
                            statusCode: null,
                        },
                    });

                    this.log.warn(
                        `could not create network connection to remote resource when trying to request content - resource: ${outgoing.name} - url: ${outgoing.contentUri}`,
                    );
                    reject(
                        boom.badGateway(
                            `Error reading content at ${outgoing.contentUri}`,
                            error,
                        ),
                    );
                    return;
                }

                timer({
                    labels: {
                        status: 'failure',
                        code: 'NETWORK_ERROR',
                        statusCode: null,
                    },
                });

                this.log.warn(
                    `could not create network connection to remote resource when trying to request content - resource: ${outgoing.name} - url: ${outgoing.contentUri}`,
                );

                outgoing.success = true;

                outgoing.pushFallback();
                resolve(outgoing);
            });

            r.on('end', () => {
                timer({
                    labels: {
                        status: 'success',
                        code: 'FETCHED',
                        statusCode: 200,
                    },
                });

                this.log.debug(
                    `successfully read content from remote resource - resource: ${outgoing.name} - url: ${outgoing.contentUri}`,
                );

                resolve(outgoing);
            });
        });
    }
};
