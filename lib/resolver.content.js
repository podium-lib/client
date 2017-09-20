'use strict';

const request = require('request');
const stream = require('stream');

module.exports = state =>
    new Promise((resolve, reject) => {
        let contentUri = state.uri.replace(
            '/manifest.json',
            state.manifest.src
        );
        contentUri += state.reqOptions.pathname;

        state.emit(
            'info',
            `content - start fetching content from podlet - manifest version is ${state
                .manifest.version}`
        );
        const r = request({
            method: 'GET',
            agent: state.agent,
            uri: contentUri,
            qs: state.reqOptions.query,
        });

        r.on('response', response => {
            if (response.statusCode !== 200) {
                // TODO: What here?
                return reject(new Error('some error'));
            }

            state.emit(
                'info',
                `content - got head response from podlet - header version is ${response
                    .headers['podlet-version']}`
            );

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

        // TODO: Log error?
        r.on('error', () => {
            state.emit(
                'info',
                'content - can not fetch content from podlet - serving fallback'
            );
            state.success = true;
            const fallback = new stream.Readable({
                read() {
                    this.push(state.fallback);
                    this.push(null);
                },
            });
            fallback.pipe(state.stream);
            resolve(state);
        });

        r.on('end', () => {
            state.emit('info', 'content - ended serving body from podlet');
            resolve(state);
        });
    });
