'use strict';

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
        request(
            {
                method: 'GET',
                agent: state.agent,
                json: true,
                uri: state.uri,
                headers,
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
                const result = Joi.validate(body, schemas.manifest.schema);
                if (result.error) {
                    return reject(result.error);
                }

                state.manifest = result.value;
                resolve(state);
            }
        );
    });
