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
                console.log('fallback - fallback html is defined in podlet manifest');
                state.fallback = state.manifest.fallback.html;
                return resolve(state);
            }

            if (state.manifest.fallback.src) {
                console.log('fallback - fallback src is defined in podlet manifest');

                let fallbackUri = state.uri.replace('/manifest.json', state.manifest.fallback.src);

                request({
                    method: 'GET',
                    agent: HTTP_AGENT,
                    uri: fallbackUri,
                }, (error, response, body) => {
                    if (error) {
                        console.log('fallback - error');
                        return reject(error);
                    }
                    if (response.statusCode !== 200) {
                        console.log('fallback - http error', response.statusCode);
                        return reject(error);
                    }

                    console.log('fallback - fetched fallback content from podlet');
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
