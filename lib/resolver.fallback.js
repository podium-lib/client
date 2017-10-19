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
        request(
            {
                method: 'GET',
                agent: state.agent,
                uri: state.fallbackUri,
                headers,
            },
            (error, response, body) => {
                if (error) {
                    return reject(error);
                }
                if (response.statusCode !== 200) {
                    return reject(
                        new Error(
                            `Fallback responded with http status ${response.statusCode}`
                        )
                    );
                }

                // Store response body as fallback html for caching
                state.manifest.fallback = body;
                state.fallback = state.manifest.fallback;
                state.emit(
                    'info',
                    'fallback - got fallback content from podlet'
                );
                resolve(state);
            }
        );
    });
