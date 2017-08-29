'use strict';

const request = require('request');
const stream = require('stream');
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

        state.emit('info', `content - start fetching content from podlet - manifest version is ${state.manifest.version}`);
        const r = request({
            method: 'GET',
            agent: HTTP_AGENT,
            uri: contentUri,
            qs: state.reqOptions.query
        });

        r.on('response', (response) => {
            if (response.statusCode !== 200) {
                return reject(error);
            }

            state.emit('info', `content - got head response from podlet - header version is ${response.headers['podlet-version']}`);

            const contentVersion = response.headers['podlet-version'];
            if (contentVersion !== state.manifest.version) {
                state.emit('info', `content - aborting request to podlet`);
                r.abort();
                state.manifest = undefined;
                return;
            }

            state.emit('info', `content - serving body from podlet`);
            state.success = true;
            r.pipe(state.stream);
        });

        r.on('error', (error) => {
            state.emit('info', 'content - can not fetch content from podlet - serving fallback');
            state.success = true;
            const fallback = new stream.Readable({
                read(size) {
                    this.push(state.fallback);
                    this.push(null);
                }
            });
            fallback.pipe(state.stream);
            resolve(state);
        });

        r.on('end', () => {
            state.emit('info', 'content - ended serving body from podlet');
            resolve(state);
        });
    });
}
