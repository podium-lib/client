'use strict';

const request = require('request');
const schemas = require('@podium/schemas');
const { toPodiumRequest } = require('@podium/context');
const stream = require('stream');
const utils = require('./utils');
const boom = require('boom');
const Joi = require('joi');
const pkg = require('../package.json');

const UA_STRING = `${pkg.name} ${pkg.version}`;

module.exports = state =>
    new Promise((resolve, reject) => {
        if (!state.manifest || !state.manifest.content) {
            state.success = true;
            state
                .fallbackStream(() => {
                    resolve(state);
                })
                .pipe(state.stream);
            return;
        }

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

        const { podiumContext } = state.reqOptions;
        const { headers: podiumContextHeaders } = toPodiumRequest({
            ...podiumContext,
            resourceMountPath: `${podiumContext.resourceMountPath}/${state
                .reqOptions.resourceName}`,
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
            qs: state.reqOptions.query,
            headers,
        });

        r.on('response', response => {
            // Remote responds but with an http error code
            const resError = response.statusCode !== 200;
            if (resError && state.throwable) {
                return reject(
                    boom.badGateway(
                        `Could not read content. Resource responded with ${response.statusCode} on ${state.contentUri}`
                    )
                );
            } else if (resError) {
                state.success = true;
                state
                    .fallbackStream(() => {
                        resolve(state);
                    })
                    .pipe(state.stream);
                return;
            }

            const contentVersion = utils.isHeaderDefined(
                response.headers,
                'podlet-version'
            )
                ? response.headers['podlet-version']
                : undefined;

            state.emit(
                'info',
                `content - got head response from podlet - header version is ${response
                    .headers['podlet-version']}`
            );

            if (
                contentVersion !== state.manifest.version &&
                contentVersion !== undefined
            ) {
                state.emit('info', `content - aborting request to podlet`);
                r.abort();
                state.manifest = undefined;
                return;
            }

            state.emit('info', `content - serving body from podlet`);
            state.success = true;
            r.pipe(state.stream);
        });

        r.on('error', error => {
            // Network error
            if (state.throwable) {
                return reject(
                    boom.badGateway(
                        `Error reading content at ${state.contentUri}`,
                        error
                    )
                );
            }

            state.emit(
                'info',
                'content - can not fetch content from podlet - serving fallback'
            );

            state.success = true;
            state
                .fallbackStream(() => {
                    resolve(state);
                })
                .pipe(state.stream);
        });

        r.on('end', () => {
            state.emit('info', 'content - ended serving body from podlet');
            resolve(state);
        });
    });
