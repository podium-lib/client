'use strict';

const request = require('request');

module.exports = state =>
    new Promise((resolve, reject) => {
        // Have manifest fallback
        if (state.manifest.fallback) {
            if (state.manifest.fallback.html) {
                state.fallback = state.manifest.fallback.html;
                state.emit(
                    'info',
                    'fallback - using fallback content from cache'
                );
                return resolve(state);
            }

            if (state.manifest.fallback.src) {
                const fallbackUri = state.uri.replace(
                    '/manifest.json',
                    state.manifest.fallback.src
                );

                state.emit(
                    'info',
                    'fallback - start fetching fallback content from podlet'
                );
                request(
                    {
                        method: 'GET',
                        agent: state.agent,
                        uri: fallbackUri,
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
                        state.manifest.fallback.html = body;
                        state.fallback = state.manifest.fallback.html;
                        state.emit(
                            'info',
                            'fallback - got fallback content from podlet'
                        );
                        resolve(state);
                    }
                );

                return;
            }
        }

        resolve(state);
    });
