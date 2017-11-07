'use strict';

const CachePolicy = require('http-cache-semantics');
const request = require('request');
const schemas = require('@podium/schemas');
const boom = require('boom');
const Joi = require('joi');
const pkg = require('../package.json');

const UA_STRING = `${pkg.name} ${pkg.version}`;

module.exports = state =>
    new Promise((resolve, reject) => {
        if (state.status === 'cached') {
            resolve(state);
            return;
        }

        const headers = {
            'User-Agent': UA_STRING,
        };

        const reqOptions = {
            method: 'GET',
            agent: state.agent,
            json: true,
            uri: state.manifestUri,
            headers,
        };

        request(reqOptions, (error, res, body) => {
            state.emit('debug', 'start reading manifest from remote resource');

            // Network error or JSON parsing error
            if (error && state.throwable) {
                state.emit(
                    'warn',
                    'could not create network connection to remote resource for manifest'
                );
                reject(
                    boom.badGateway(
                        `Error reading manifest at ${state.manifestUri}`,
                        error
                    )
                );
                return;
            } else if (error) {
                state.emit(
                    'warn',
                    'could not create network connection to remote resource for manifest'
                );
                resolve(state);
                return;
            }

            // Remote responds but with an http error code
            const resError = res.statusCode !== 200;
            if (resError && state.throwable) {
                state.emit(
                    'warn',
                    'could not read manifest from remote resource'
                );
                reject(
                    boom.badGateway(
                        `Could not read manifest. Resource responded with ${res.statusCode} on ${state.manifestUri}`
                    )
                );
                return;
            } else if (resError) {
                state.emit(
                    'warn',
                    'could not read manifest from remote resource'
                );
                resolve(state);
                return;
            }

            state.emit('debug', `read manifest from remote source`);
            const manifest = Joi.validate(body, schemas.manifest.schema);

            // Manifest validation error
            if (manifest.error && state.throwable) {
                state.emit(
                    'warn',
                    'could not parse manifest from remote resource'
                );
                reject(
                    boom.wrap(
                        manifest.error,
                        502,
                        `Error validating manifest from ${state.manifestUri}`
                    )
                );
                return;
            } else if (manifest.error) {
                state.emit(
                    'warn',
                    'could not parse manifest from remote resource'
                );
                resolve(state);
                return;
            }

            // Manifest is valid, calculate maxAge for caching and continue
            const resValues = {
                status: res.statusCode,
                headers: res.headers,
            };

            const cachePolicy = new CachePolicy(reqOptions, resValues, {
                ignoreCargoCult: true,
            });
            const maxAge = cachePolicy.timeToLive();
            if (maxAge !== 0) {
                state.emit(
                    'debug',
                    `remote resource has cache header which yelds an max age of ${maxAge}ms`
                );
                state.maxAge = maxAge;
            }

            state.manifest = manifest.value;
            state.status = 'fresh';
            state.emit('debug', 'read manifest from remote resource');
            resolve(state);
        });
    });
