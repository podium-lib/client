'use strict';

const CachePolicy = require('http-cache-semantics');
const request = require('request');
const schemas = require('@podium/schemas');
const Joi = require('joi');
const pkg = require('../package.json');

const UA_STRING = `${pkg.name} ${pkg.version}`;

module.exports = state =>
    new Promise((resolve, reject) => {
        if (state.manifest) {
            state.emit('info', 'manifest - using manifest from cache');
            return resolve(state);
        }

        const headers = {
            'User-Agent': UA_STRING,
        };

        state.emit('info', 'manifest - start fetching manifest from podlet');

        const reqOptions = {
            method: 'GET',
            agent: state.agent,
            json: true,
            uri: state.uri,
            headers,
        };

        request(
            reqOptions,
            (error, response, body) => {
                if (error) {
                    // console.log('manifest - error');
                    return reject(error);
                }
                if (response.statusCode !== 200) {
                    // console.log('manifest - http error', response.statusCode);
                    return reject(error);
                }

                const resValues = {
                    status: response.statusCode,
                    headers: response.headers,
                }

                const cachePolicy = new CachePolicy(reqOptions, resValues, {
                    ignoreCargoCult: true
                });
                const maxAge = cachePolicy.timeToLive();
                if (maxAge !== 0) {
                    state.emit('info', `manifest - podlet has cache header: ${maxAge}`);
                    state.maxAge = maxAge;
                }

                state.emit('info', `manifest - got manifest from podlet`);
                const result = Joi.validate(body, schemas.manifest.schema);
                if (result.error) {
                    return reject(result.error);
                }

                state.manifest = result.value;
                resolve(state);
            }
        );
    });
