/* eslint-disable no-param-reassign */

'use strict';

const { pipeline } = require('readable-stream');
const Metrics = require('@metrics/client');
const request = require('request');
const abslog = require('abslog');
const putils = require('@podium/utils');
const boom = require('boom');
const utils = require('./utils');
const pkg = require('../package.json');

const UA_STRING = `${pkg.name} ${pkg.version}`;

module.exports = class PodletClientContentResolver {
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
        return 'PodletClientContentResolver';
    }

    resolve(state) {
        return new Promise((resolve, reject) => {
            if (
                state.killRecursions === state.killThreshold &&
                state.throwable
            ) {
                this.log.warn(
                    `recursion detected - failed to resolve fetching of podlet ${
                        state.killRecursions
                    } times - throwing - resource: ${
                        state.resourceName
                    } - url: ${state.manifestUri}`,
                );
                reject(
                    boom.badGateway(
                        `Recursion detected - failed to resolve fetching of podlet ${
                            state.killRecursions
                        } times`,
                    ),
                );
                return;
            }
            if (state.killRecursions === state.killThreshold) {
                this.log.warn(
                    `recursion detected - failed to resolve fetching of podlet ${
                        state.killRecursions
                    } times - serving fallback - resource: ${
                        state.resourceName
                    } - url: ${state.manifestUri}`,
                );
                state.success = true;
                pipeline(
                    state.fallbackStream(),
                    state.stream,
                    (err) => {
                        if (err) {
                            console.log(err);
                        }
                        resolve(state);
                    }
                );
                /*
                state
                    .fallbackStream(() => {
                        resolve(state);
                    })
                    .pipe(state.stream);
                */
                return;
            }

            if (state.status === 'empty' && state.throwable) {
                this.log.warn(
                    `no manifest available - cannot read content - throwing - resource: ${
                        state.resourceName
                    } - url: ${state.manifestUri}`,
                );
                reject(
                    boom.badGateway(
                        `No manifest available - Cannot read content`,
                    ),
                );
                return;
            }
            if (state.status === 'empty') {
                this.log.warn(
                    `no manifest available - cannot read content - serving fallback - resource: ${
                        state.resourceName
                    } - url: ${state.manifestUri}`,
                );
                state.success = true;
                pipeline(
                    state.fallbackStream(),
                    state.stream,
                    (err) => {
                        if (err) {
                            console.log(err);
                        }
                        resolve(state);
                    }
                );
                /*
                state
                    .fallbackStream(() => {
                        resolve(state);
                    })
                    .pipe(state.stream);
                */
                return;
            }

            const headers = Object.assign({}, state.reqOptions.headers, {
                'User-Agent': UA_STRING,
            });

            putils.serializeContext(
                headers,
                state.reqOptions.podiumContext,
                state.resourceName,
            );

            const reqOptions = {
                timeout: state.timeout,
                method: 'GET',
                agent: this.agent,
                uri: state.contentUri,
                qs: state.reqOptions.query,
                headers,
            };

            const timer = this.metrics.timer({
                name: 'podlet_content_request',
                description:
                    'Time taken for success/failure of content request',
                meta: {
                    url: reqOptions.uri,
                    method: reqOptions.method,
                },
            });

            this.log.debug(
                `start reading content from remote resource - manifest version is ${
                    state.manifest.version
                } - resource: ${state.resourceName} - url: ${state.contentUri}`,
            );

            const r = request(reqOptions);

            r.on('response', response => {

                // Remote responds but with an http error code
                const resError = response.statusCode !== 200;
                if (resError && state.throwable) {
                    timer({
                        meta: {
                            status: 'failure',
                            code: 'HTTP_ERROR',
                            statusCode: response.statusCode,
                        },
                    });

                    this.log.warn(
                        `remote resource responded with non 200 http status code for content - code: ${
                            response.statusCode
                        } - resource: ${state.resourceName} - url: ${
                            state.contentUri
                        }`,
                    );

                    reject(
                        boom.boomify(
                            new Error(
                                `Could not read content. Resource responded with ${
                                    response.statusCode
                                } on ${state.contentUri}`,
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
                        meta: {
                            status: 'failure',
                            code: 'HTTP_ERROR',
                            statusCode: response.statusCode,
                        },
                    });

                    this.log.warn(
                        `remote resource responded with non 200 http status code for content - code: ${
                            response.statusCode
                        } - resource: ${state.resourceName} - url: ${
                            state.contentUri
                        }`,
                    );
                    state.success = true;
                    pipeline(
                        state.fallbackStream(),
                        state.stream,
                        (err) => {
                            if (err) {
                                console.log(err);
                            }
                            resolve(state);
                        }
                    );
                    /*
                    state
                        .fallbackStream(() => {
                            resolve(state);
                        })
                        .pipe(state.stream);
                    */
                    return;
                }

                const contentVersion = utils.isHeaderDefined(
                    response.headers,
                    'podlet-version',
                )
                    ? response.headers['podlet-version']
                    : undefined;

                this.log.debug(
                    `got head response from remote resource for content - header version is ${
                        response.headers['podlet-version']
                    } - resource: ${state.resourceName} - url: ${
                        state.contentUri
                    }`,
                );

                if (
                    contentVersion !== state.manifest.version &&
                    contentVersion !== undefined
                ) {
                    timer({
                        meta: {
                            status: 'success',
                            code: 'STALE',
                            statusCode: 200,
                        },
                    });

                    this.log.info(
                        `podlet version number in header differs from cached version number - aborting request to remote resource for content - resource: ${
                            state.resourceName
                        } - url: ${state.contentUri}`,
                    );
                    r.abort();
                    state.status = 'stale';
                    return;
                }

                state.success = true;
                state.stream.emit('headers', response.headers);
                pipeline(r, state.stream,
                    (err) => {
                        if (err) {
                            console.log(err);
                        }
                    }
                );
                process.nextTick(() => {

                    // r.pipe(state.stream);
                });
            });

            r.on('error', error => {
                // Network error
                if (state.throwable) {
                    timer({
                        meta: {
                            status: 'failure',
                            code: 'NETWORK_ERROR',
                            statusCode: null,
                        },
                    });

                    this.log.warn(
                        `could not create network connection to remote resource when trying to request content - resource: ${
                            state.resourceName
                        } - url: ${state.contentUri}`,
                    );
                    reject(
                        boom.badGateway(
                            `Error reading content at ${state.contentUri}`,
                            error,
                        ),
                    );
                    return;
                }

                timer({
                    meta: {
                        status: 'failure',
                        code: 'NETWORK_ERROR',
                        statusCode: null,
                    },
                });

                this.log.warn(
                    `could not create network connection to remote resource when trying to request content - resource: ${
                        state.resourceName
                    } - url: ${state.contentUri}`,
                );

                state.success = true;
                pipeline(
                    state.fallbackStream(),
                    state.stream,
                    (err) => {
                        if (err) {
                            console.log(err);
                        }
                        resolve(state);
                    }
                );
                /*
                state
                    .fallbackStream(() => {
                        resolve(state);
                    })
                    .pipe(state.stream);
                */
            });

            r.on('end', () => {
                timer({
                    meta: {
                        status: 'success',
                        code: null,
                        statusCode: 200,
                    },
                });

                this.log.debug(
                    `successfully read content from remote resource - resource: ${
                        state.resourceName
                    } - url: ${state.contentUri}`,
                );

                resolve(state);
            });
        });
    }
};
