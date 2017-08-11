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
        let contentUri = state.uri.replace('/manifest.json', state.manifest.src);
        contentUri += state.reqOptions.pathname;

        state.emit('info', 'content - start fetching content from podlet');
        const r = request({
            method: 'GET',
            agent: HTTP_AGENT,
            uri: contentUri,
            qs: state.reqOptions.query
        });

        r.on('response', (response) => {
            if (response.statusCode !== 200) {
//                console.log('content - http error', response.statusCode);
                return reject(error);
            }

            const contentVersion = response.headers['podlet-version'];
//            console.log('contentVersion', contentVersion);
            if (contentVersion !== '1.0.0-beta.2') {
                r.abort();
                return resolve(state);
            }

            state.success = true;
            r.pipe(state.stream);
        });

        r.on('error', (error) => {
            state.content = state.fallback;
            state.success = true;
            state.emit('info', 'content - can not fetch content from podlet - serving fallback');
            resolve(state);
        });

        r.on('end', () => {
            state.emit('info', 'content - got content from podlet');
            resolve(state);
        });
    });
}
