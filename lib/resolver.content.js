/* eslint-disable no-param-reassign */

import { pipeline } from 'stream';
import Metrics from '@metrics/client';
import request from 'request';
import abslog from 'abslog';
import * as putils from '@podium/utils';
import { Boom, badGateway } from '@hapi/boom';

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import * as utils from './utils.js';
import Response from './response.js';

const currentDirectory = dirname(fileURLToPath(import.meta.url));

const pkgJson = fs.readFileSync(join(currentDirectory, '../package.json'), 'utf-8');
const pkg = JSON.parse(pkgJson);

const UA_STRING = `${pkg.name} ${pkg.version}`;

export default class PodletClientContentResolver {
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
            name: 'podium_client_resolver_content_resolve',
            description: 'Time taken for success/failure of content request',
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
        return new Promise((resolve, reject) => {
            if (outgoing.kill && outgoing.throwable) {
                this.#log.warn(
                    `recursion detected - failed to resolve fetching of podlet ${outgoing.recursions} times - throwing - resource: ${outgoing.name} - url: ${outgoing.manifestUri}`,
                );
                reject(
                    badGateway(
                        `Recursion detected - failed to resolve fetching of podlet ${outgoing.recursions} times`,
                    ),
                );
                return;
            }

            if (outgoing.kill) {
                this.#log.warn(
                    `recursion detected - failed to resolve fetching of podlet ${outgoing.recursions} times - serving fallback - resource: ${outgoing.name} - url: ${outgoing.manifestUri}`,
                );
                outgoing.success = true;
                outgoing.pushFallback();
                resolve(outgoing);
                return;
            }

            if (outgoing.status === 'empty' && outgoing.throwable) {
                this.#log.warn(
                    `no manifest available - cannot read content - throwing - resource: ${outgoing.name} - url: ${outgoing.manifestUri}`,
                );
                reject(
                    badGateway(`No manifest available - Cannot read content`),
                );
                return;
            }

            if (outgoing.status === 'empty') {
                this.#log.warn(
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
                agent: this.#agent,
                uri: putils.uriBuilder(
                    outgoing.reqOptions.pathname,
                    outgoing.contentUri,
                ),
                qs: outgoing.reqOptions.query,
                headers,
            };

            if (outgoing.redirectable) {
                reqOptions.followRedirect = false;
            }

            const timer = this.#histogram.timer({
                labels: {
                    podlet: outgoing.name,
                },
            });

            this.#log.debug(
                `start reading content from remote resource - manifest version is ${outgoing.manifest.version} - resource: ${outgoing.name} - url: ${outgoing.contentUri}`,
            );

            const r = request(reqOptions);

            r.on('response', response => {
                // Remote responds but with an http error code
                const resError = response.statusCode >= 400;
                if (resError && outgoing.throwable) {
                    timer({
                        labels: {
                            status: 'failure',
                        },
                    });

                    this.#log.warn(
                        `remote resource responded with non 200 http status code for content - code: ${response.statusCode} - resource: ${outgoing.name} - url: ${outgoing.contentUri}`,
                    );

                    const errorMessage = `Could not read content. Resource responded with ${response.statusCode} on ${outgoing.contentUri}`;

                    const errorOptions = {
                        statusCode: response.statusCode,
                        decorate: {
                            statusCode: response.statusCode,
                        },
                    };

                    reject(new Boom(errorMessage, errorOptions));
                    return;
                }
                if (resError) {
                    timer({
                        labels: {
                            status: 'failure',
                        },
                    });

                    this.#log.warn(
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

                this.#log.debug(
                    `got head response from remote resource for content - header version is ${response.headers['podlet-version']} - resource: ${outgoing.name} - url: ${outgoing.contentUri}`,
                );

                if (
                    contentVersion !== outgoing.manifest.version &&
                    contentVersion !== undefined
                ) {
                    timer({
                        labels: {
                            status: 'success',
                        },
                    });

                    this.#log.info(
                        `podlet version number in header differs from cached version number - aborting request to remote resource for content - resource: ${outgoing.name} - url: ${outgoing.contentUri}`,
                    );
                    r.abort();
                    outgoing.status = 'stale';
                    return;
                }

                outgoing.success = true;
                outgoing.headers = response.headers;

                if (outgoing.redirectable && response.statusCode >= 300) {
                    outgoing.redirect = {
                        statusCode: response.statusCode,
                        location: response.headers && response.headers.location,
                    };
                }

                outgoing.emit(
                    'beforeStream',
                    new Response({
                        headers: outgoing.headers,
                        js: outgoing.manifest.js,
                        css: outgoing.manifest.css,
                        redirect: outgoing.redirect,
                    }),
                );

                pipeline([r, outgoing], (err) => {
                    if (err) {
                        this.#log.warn('error while piping content stream', err);
                    }
                });
            });

            r.on('error', error => {
                // Network error
                if (outgoing.throwable) {
                    timer({
                        labels: {
                            status: 'failure',
                        },
                    });

                    this.#log.warn(
                        `could not create network connection to remote resource when trying to request content - resource: ${outgoing.name} - url: ${outgoing.contentUri}`,
                    );
                    reject(
                        badGateway(
                            `Error reading content at ${outgoing.contentUri}`,
                            error,
                        ),
                    );
                    return;
                }

                timer({
                    labels: {
                        status: 'failure',
                    },
                });

                this.#log.warn(
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
                    },
                });

                this.#log.debug(
                    `successfully read content from remote resource - resource: ${outgoing.name} - url: ${outgoing.contentUri}`,
                );

                resolve(outgoing);
            });
        });
    }

    get [Symbol.toStringTag]() {
        return 'PodletClientContentResolver';
    }
};
