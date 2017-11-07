'use strict';

const request = require('request');
const boom = require('boom');
const pkg = require('../package.json');

const UA_STRING = `${pkg.name} ${pkg.version}`;

module.exports = state =>
    new Promise((resolve, reject) => {
        if (state.status === 'cached') {
            resolve(state);
            return;
        }

        // Manifest have no fallback, fetching manifest did probably fail.
        // Its not possible to fetch anything
        if (state.manifest.fallback === undefined) {
            resolve(state);
            return;
        }

        // If manifest fallback is empty, there is no fallback content to fetch
        if (state.manifest.fallback === '') {
            state.emit('debug', 'no fallback defined in manifest');
            state.status = 'fresh';
            resolve(state);
            return;
        }

        // The manifest fallback holds a URI, fetch its content
        const headers = {
            'User-Agent': UA_STRING,
        };

        const reqOptions = {
            method: 'GET',
            agent: state.agent,
            uri: state.fallbackUri,
            headers,
        };

        request(reqOptions, (error, res, body) => {
            state.emit(
                'debug',
                'start reading fallback content from remote resource'
            );

            // Network error
            if (error && state.throwable) {
                state.emit(
                    'warn',
                    'could not create network connection to remote resource for fallback content'
                );
                reject(
                    boom.badGateway(
                        `Error reading fallback at ${state.fallbackUri}`,
                        error
                    )
                );
                return;
            } else if (error) {
                state.emit(
                    'warn',
                    'could not create network connection to remote resource for fallback content'
                );
                resolve(state);
                return;
            }

            // Remote responds but with an http error code
            const resError = res.statusCode !== 200;
            if (resError && state.throwable) {
                state.emit(
                    'warn',
                    'could not read fallback content from remote resource'
                );
                reject(
                    boom.badGateway(
                        `Could not read fallback. Resource responded with ${res.statusCode} on ${state.fallbackUri}`
                    )
                );
                return;
            } else if (resError) {
                state.emit(
                    'warn',
                    'could not read fallback content from remote resource'
                );
                resolve(state);
                return;
            }

            // Response is OK. Store response body as fallback html for caching
            state.fallback = body;
            state.status = 'fresh';
            state.emit('debug', 'read fallback content from remote resource');
            resolve(state);
        });
    });
