'use strict';

const request = require('request');
const schemas = require('@podium/schemas');
const Joi = require('joi');
const pkg = require('../package.json');

const UA_STRING = `${pkg.name} ${pkg.version}`;

module.exports = state =>
    new Promise((resolve, reject) => {
        if (state.manifest.fallback === undefined) {
            return resolve(state);
        }

        const result = Joi.validate(
            state.manifest.fallback,
            schemas.manifest.uri
        );

        // Fallback holds HTML content
        if (result.error) {
            state.emit(
                'info',
                'fallback - manifest hold fallback from podlet - using the fallback value'
            );
            state.fallback = state.manifest.fallback;
            return resolve(state);
        }

        const headers = {
            'User-Agent': UA_STRING,
        };

        state.emit(
            'info',
            'fallback - start fetching fallback content from podlet'
        );

        const reqOptions = {
            method: 'GET',
            agent: state.agent,
            uri: state.fallbackUri,
            headers,
        };

        request(reqOptions, (error, res, body) => {
            // Network error
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
                        `Could not read fallback. Resource responded with ${res.statusCode} on ${state.fallbackUri}`
                    )
                );
            } else if (resError) {
                return resolve(state);
            }

            // Response is OK. Store response body as fallback html for caching
            state.manifest.fallback = body;
            state.fallback = state.manifest.fallback;
            state.emit('info', 'fallback - got fallback content from podlet');
            resolve(state);
        });
    });
