'use strict';

const request = require('request');
const schemas = require('@podium/schemas');
const { toPodiumRequest } = require('@podium/context');
const stream = require('stream');
const Joi = require('joi');
const pkg = require('../package.json');

const UA_STRING = `${pkg.name} ${pkg.version}`;

module.exports = state =>
    new Promise((resolve, reject) => {
        const result = Joi.validate(
            state.manifest.content,
            schemas.manifest.uri
        );

        if (result.error) {
            state.emit(
                'info',
                'content - manifest hold content from podlet - serving the content value'
            );
            state.success = true;
            const content = new stream.Readable({
                read() {
                    this.push(state.manifest.content);
                    this.push(null);
                },
            });
            content.on('end', () => {
                resolve(state);
            });
            content.pipe(state.stream);
            return;
        }

        const { reqOptions } = state;

        const { podiumContext } = reqOptions;

        const { headers: podiumContextHeaders } = toPodiumRequest({
            ...podiumContext,
            resourceMountPath: `${podiumContext.resourceMountPath}/${reqOptions.resourceName}`,
        });

        const headers = {
            'User-Agent': UA_STRING,
            ...podiumContextHeaders,
        };

        state.emit(
            'info',
            `content - start fetching content from podlet - manifest version is ${state
                .manifest.version}`
        );
        const r = request({
            method: 'GET',
            agent: state.agent,
            uri: state.contentUri,
            qs: reqOptions.query,
            headers,
        });

        r.on('response', response => {
            if (response.statusCode !== 200) {
                // TODO: What here?
                return reject(new Error('some error'));
            }

            const contentVersion = response.headers['podlet-version'];

            state.emit(
                'info',
                `content - got head response from podlet - header version is ${response
                    .headers['podlet-version']}`
            );

            if (contentVersion !== state.manifest.version && contentVersion !== undefined) {
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
            fallback.on('end', () => {
                resolve(state);
            });
            fallback.pipe(state.stream);
        });

        r.on('end', () => {
            state.emit('info', 'content - ended serving body from podlet');
            resolve(state);
        });
    });
