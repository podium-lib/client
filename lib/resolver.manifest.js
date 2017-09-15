'use strict';

const request = require('request');
const http = require('http');

const HTTP_AGENT = new http.Agent({
    keepAlive: true,
    maxSockets: 10,
    maxFreeSockets: 10,
    timeout: 60000,
    keepAliveMsecs: 30000,
});

module.exports = state =>
    new Promise((resolve, reject) => {
        if (state.manifest) {
            state.emit('info', 'manifest - using manifest from cache');
            return resolve(state);
        }

        state.emit('info', 'manifest - start fetching manifest from podlet');
        request(
            {
                method: 'GET',
                agent: HTTP_AGENT,
                json: true,
                uri: state.uri,
            },
            (error, response, body) => {
                if (error) {
                    // console.log('manifest - error');
                    return reject(error);
                }
                if (response.statusCode !== 200) {
                    // console.log('manifest - http error', response.statusCode);
                    return reject(error);
                }

                state.emit('info', `manifest - got manifest from podlet`);
                state.manifest = body;
                resolve(state);
            }
        );
    });
