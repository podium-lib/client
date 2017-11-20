'use strict';

const request = require('request');
const { toPodiumRequest } = require('@podium/context');
const utils = require('./utils');
const boom = require('boom');
const pkg = require('../package.json');

const UA_STRING = `${pkg.name} ${pkg.version}`;

module.exports = state =>
    new Promise((resolve, reject) => {
        if (state.status === 'empty') {
            state.emit(
                'warn',
                'no manifest available - cannot fetch main content - serving fallback'
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

        state.emit(
            'debug',
            `start reading main content from remote resource - manifest version is ${
                state.manifest.version
            }`
        );

        const r = request({
            timeout: state.timeout,
            method: 'GET',
            agent: state.agent,
            uri: state.contentUri,
            qs: state.reqOptions.query,
            headers,
        });

        r.on('response', response => {
            // Remote responds but with an http error code
            const resError = response.statusCode !== 200;
            if (resError && state.throwable) {
                state.emit(
                    'warn',
                    'could not create network connection to remote resource for main content'
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
                state.emit(
                    'warn',
                    'could not create network connection to remote resource for main content'
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

            state.emit(
                'debug',
                `got head response from remote resource for main content - header version is ${
                    response.headers['podlet-version']
                }`
            );

            if (
                contentVersion !== state.manifest.version &&
                contentVersion !== undefined
            ) {
                state.emit(
                    'info',
                    `podlet version number in header differs from cached version number - aborting request to remote resource for main content`
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
                state.emit(
                    'warn',
                    'could not create network connection to remote resource for main content'
                );
                reject(
                    boom.badGateway(
                        `Error reading content at ${state.contentUri}`,
                        error
                    )
                );
                return;
            }

            state.emit(
                'warn',
                'could not create network connection to remote resource for main content'
            );

            state.success = true;
            state
                .fallbackStream(() => {
                    resolve(state);
                })
                .pipe(state.stream);
        });

        r.on('end', () => {
            state.emit('debug', 'read content from remote resource');
            resolve(state);
        });
    });
