'use strict';

const Metrics = require('@podium/metrics');
const request = require('request');
const abslog = require('abslog');
const putils = require('@podium/utils');
const utils = require('./utils');
const boom = require('boom');
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
    }

    get [Symbol.toStringTag]() {
        return 'PodletClientContentResolver';
    }

    resolve(state) {
        return new Promise((resolve, reject) => {
            if (state.status === 'empty') {
                this.log.warn(
                    `no manifest available - cannot read content - serving fallback - resource: ${
                        state.resourceName
                    } - url: ${state.manifestUri}`
                );
                state.success = true;
                state
                    .fallbackStream(() => {
                        resolve(state);
                    })
                    .pipe(state.stream);
                return;
            }

            const headers = {
                'User-Agent': UA_STRING,
            };

            putils.serializeContext(
                headers,
                state.reqOptions.podiumContext,
                state.resourceName
            );

            const reqOptions = {
                timeout: state.timeout,
                method: 'GET',
                agent: this.agent,
                uri: state.contentUri,
                qs: state.reqOptions.query,
                headers,
            };

            const successTimer = this.metrics.timer({
                name: 'content_request_success',
                description: 'Time taken for successful content request',
                url: reqOptions.uri,
                method: reqOptions.method,
            });

            const failureTimer = this.metrics.timer({
                name: 'content_request_failure',
                description: 'Time taken for failing content request',
                url: reqOptions.uri,
                method: reqOptions.method,
            });

            this.log.debug(
                `start reading content from remote resource - manifest version is ${
                    state.manifest.version
                } - resource: ${state.resourceName} - url: ${state.contentUri}`
            );

            const r = request(reqOptions);

            r.on('response', response => {
                // Remote responds but with an http error code
                const resError = response.statusCode !== 200;
                if (resError && state.throwable) {
                    failureTimer({ status: response.statusCode });

                    this.log.warn(
                        `could not create network connection to remote resource for content - resource: ${
                            state.resourceName
                        } - url: ${state.contentUri}`
                    );

                    reject(
                        boom.boomify(
                            new Error(
                                `Could not read content. Resource responded with ${
                                    response.statusCode
                                } on ${state.contentUri}`
                            ),
                            {
                                statusCode: response.statusCode,
                            }
                        )
                    );
                    return;
                } else if (resError) {
                    failureTimer();

                    this.log.warn(
                        `could not create network connection to remote resource for content - resource: ${
                            state.resourceName
                        } - url: ${state.contentUri}`
                    );
                    state.success = true;
                    state
                        .fallbackStream(() => {
                            resolve(state);
                        })
                        .pipe(state.stream);
                    return;
                }

                const contentVersion = utils.isHeaderDefined(
                    response.headers,
                    'podlet-version'
                )
                    ? response.headers['podlet-version']
                    : undefined;

                this.log.debug(
                    `got head response from remote resource for content - header version is ${
                        response.headers['podlet-version']
                    } - resource: ${state.resourceName} - url: ${
                        state.contentUri
                    }`
                );

                if (
                    contentVersion !== state.manifest.version &&
                    contentVersion !== undefined
                ) {
                    failureTimer({ status: response.statusCode });

                    this.log.info(
                        `podlet version number in header differs from cached version number - aborting request to remote resource for content - resource: ${
                            state.resourceName
                        } - url: ${state.contentUri}`
                    );
                    r.abort();
                    state.status = 'stale';
                    return;
                }

                state.success = true;

                r.pipe(state.stream);
            });

            r.on('error', error => {
                // Network error
                if (state.throwable) {
                    failureTimer();

                    this.log.warn(
                        `could not create network connection to remote resource when trying to request content - resource: ${
                            state.resourceName
                        } - url: ${state.contentUri}`
                    );
                    reject(
                        boom.badGateway(
                            `Error reading content at ${state.contentUri}`,
                            error
                        )
                    );
                    return;
                }

                failureTimer();

                this.log.warn(
                    `could not create network connection to remote resource when trying to request content - resource: ${
                        state.resourceName
                    } - url: ${state.contentUri}`
                );

                state.success = true;
                state
                    .fallbackStream(() => {
                        resolve(state);
                    })
                    .pipe(state.stream);
            });

            r.on('end', () => {
                successTimer();

                this.log.debug(
                    `successfully read content from remote resource - resource: ${
                        state.resourceName
                    } - url: ${state.contentUri}`
                );

                resolve(state);
            });
        });
    }
};
