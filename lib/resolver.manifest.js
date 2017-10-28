'use strict';

const CachePolicy = require('http-cache-semantics');
const request = require('request');
const schemas = require('@podium/schemas');
const Joi = require('joi');
const pkg = require('../package.json');

const UA_STRING = `${pkg.name} ${pkg.version}`;

module.exports = state =>
    new Promise((resolve, reject) => {
        if (state.manifest) {
            state.emit('info', 'manifest - using manifest from cache');
            return resolve(state);
        }

        const headers = {
            'User-Agent': UA_STRING,
        };

        state.emit('info', 'manifest - start fetching manifest from podlet');

        const reqOptions = {
            method: 'GET',
            agent: state.agent,
            json: true,
            uri: state.manifestUri,
            headers,
        };

        request(reqOptions, (error, res, body) => {
            // Network error or JSON parsing error
            if (error && state.throwable) {
                return reject(error);
            } else if (error) {
                return resolve(state);
            }

            // Remote responds but with an http error code
            const resError = res.statusCode !== 200;
            if (resError && state.throwable) {
                return reject(
                    new Error(
                        `Could not read manifest. Resource responded with ${res.statusCode} on ${state.manifestUri}`
                    )
                );
            } else if (resError) {
                return resolve(state);
            }

            state.emit('info', `manifest - got manifest from podlet`);
            const manifest = Joi.validate(body, schemas.manifest.schema);

            // Manifest validation error
            if (manifest.error && state.throwable) {
                return reject(manifest.error);
            } else if (manifest.error) {
                return resolve(state);
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
                    'info',
                    `manifest - podlet has cache header: ${maxAge}`
                );
                state.maxAge = maxAge;
            }

            state.manifest = manifest.value;
            resolve(state);
        });
    });
