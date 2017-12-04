'use strict';

const request = require('request');
const abslog = require('abslog');
const { toPodiumRequest } = require('@podium/context');
const utils = require('./utils');
const boom = require('boom');
const pkg = require('../package.json');

const UA_STRING = `${pkg.name} ${pkg.version}`;

module.exports = class PodletClientContentResolver {
    constructor(options = {}) {
        Object.defineProperty(this, 'log', {
            value: abslog(options.logger),
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
                    'no manifest available - cannot fetch main content - serving fallback',
                    state.manifestUri
                );
                state.success = true;
                state
                    .fallbackStream(() => {
                        resolve(state);
                    })
                    .pipe(state.stream);
                return;
            }

            const { podiumContext } = state.reqOptions;
            const { headers: podiumContextHeaders } = toPodiumRequest({
                ...podiumContext,
                resourceMountPath: `${podiumContext.resourceMountPath}/${
                    state.reqOptions.resourceName
                }`,
            });

            const headers = {
                'User-Agent': UA_STRING,
                ...podiumContextHeaders,
            };

            this.log.debug(
                `start reading main content from remote resource - manifest version is ${
                    state.manifest.version
                }`,
                state.contentUri
            );

            const r = request({
                timeout: state.timeout,
                method: 'GET',
                agent: this.agent,
                uri: state.contentUri,
                qs: state.reqOptions.query,
                headers,
            });

            r.on('response', response => {
                // Remote responds but with an http error code
                const resError = response.statusCode !== 200;
                if (resError && state.throwable) {
                    this.log.warn(
                        'could not create network connection to remote resource for main content',
                        state.contentUri
                    );
                    reject(
                        boom.badGateway(
                            `Could not read content. Resource responded with ${
                                response.statusCode
                            } on ${state.contentUri}`
                        )
                    );
                    return;
                } else if (resError) {
                    this.log.warn(
                        'could not create network connection to remote resource for main content',
                        state.contentUri
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
                    `got head response from remote resource for main content - header version is ${
                        response.headers['podlet-version']
                    }`,
                    state.contentUri
                );

                if (
                    contentVersion !== state.manifest.version &&
                    contentVersion !== undefined
                ) {
                    this.log.info(
                        `podlet version number in header differs from cached version number - aborting request to remote resource for main content`,
                        state.contentUri
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
                    this.log.warn(
                        'could not create network connection to remote resource for main content',
                        state.contentUri
                    );
                    reject(
                        boom.badGateway(
                            `Error reading content at ${state.contentUri}`,
                            error
                        )
                    );
                    return;
                }

                this.log.warn(
                    'could not create network connection to remote resource for main content',
                    state.contentUri
                );

                state.success = true;
                state
                    .fallbackStream(() => {
                        resolve(state);
                    })
                    .pipe(state.stream);
            });

            r.on('end', () => {
                this.log.debug(
                    'successfully read content from remote resource',
                    state.contentUri
                );
                resolve(state);
            });
        });
    }
};
