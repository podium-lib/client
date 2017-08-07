'use strict';

const request = require('request');
const http = require('http');

const HTTP_AGENT = new http.Agent({
    keepAlive: true,
    maxSockets: 10,
    maxFreeSockets: 10,
    timeout: 60000,
    keepAliveMsecs: 30000
});


module.exports = (state) => {
    return new Promise((resolve, reject) => {

        // Have manifest fallback
        if (state.manifest.fallback) {

            if (state.manifest.fallback.html) {
                state.fallback = state.manifest.fallback.html;
                return resolve(state);
            }

            if (state.manifest.fallback.src) {
                let fallbackUri = state.uri.replace('/manifest.json', state.manifest.fallback.src);

                request({
                    method: 'GET',
                    agent: HTTP_AGENT,
                    uri: fallbackUri,
                }, (error, response, body) => {
                    if (error) {
                        return reject(error);
                    }
                    if (response.statusCode !== 200) {
                        return reject(new Error(`Fallback responded with http status ${response.statusCode}`));
                    }

                    // Store response body as fallback html for caching
                    state.manifest.fallback.html = body;
                    state.fallback = state.manifest.fallback.html;
                    resolve(state);
                });

                return;
            }
        }

        resolve(state);
    });
}
