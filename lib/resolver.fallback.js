/* eslint-disable no-param-reassign */

import { request } from 'undici';
import abslog from 'abslog';
import Metrics from '@metrics/client';

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const currentDirectory = dirname(fileURLToPath(import.meta.url));

const pkgJson = fs.readFileSync(
    join(currentDirectory, '../package.json'),
    'utf-8',
);
const pkg = JSON.parse(pkgJson);

const UA_STRING = `${pkg.name} ${pkg.version}`;

export default class PodletClientFallbackResolver {
    #log;
    #metrics;
    #histogram;
    // #httpAgent;
    // #httpsAgent;
    constructor(options = {}) {
        const name = options.clientName;
        this.#log = abslog(options.logger);
        this.#metrics = new Metrics();
        // this.#httpAgent = options.httpAgent;
        // this.#httpsAgent = options.httpsAgent;
        this.#histogram = this.#metrics.histogram({
            name: 'podium_client_resolver_fallback_resolve',
            description: 'Time taken for success/failure of fallback request',
            labels: {
                name,
                status: null,
                podlet: null,
            },
            buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 10],
        });

        this.#metrics.on('error', (error) => {
            this.#log.error(
                'Error emitted by metric stream in @podium/client module',
                error,
            );
        });
    }

    get metrics() {
        return this.#metrics;
    }

    async resolve(outgoing) {
        if (outgoing.status === 'cached') {
            return outgoing;
        }

        // Manifest has no fallback, fetching of manifest likely failed.
        // Its not possible to fetch anything
        // Do not set fallback so we can serve any previous fallback we might have
        if (outgoing.manifest.fallback === undefined) {
            return outgoing;
        }

        // If manifest fallback is empty, there is no fallback content to fetch
        // Set fallback to empty string
        if (outgoing.manifest.fallback === '') {
            this.#log.debug(
                `no fallback defined in manifest - resource: ${outgoing.name}`,
            );
            outgoing.fallback = '';
            return outgoing;
        }

        // The manifest fallback holds a URI, fetch its content
        const headers = {
            'User-Agent': UA_STRING,
        };

        const reqOptions = {
            rejectUnauthorized: outgoing.rejectUnauthorized,
            timeout: outgoing.timeout,
            method: 'GET',
            // agent: outgoing.fallbackUri.startsWith('https://')
            // ? this.#httpsAgent
            // : this.#httpAgent,
            headers,
        };

        const timer = this.#histogram.timer({
            labels: {
                podlet: outgoing.name,
            },
        });

        try {
            this.#log.debug(
                `start reading fallback content from remote resource - resource: ${outgoing.name} - url: ${outgoing.fallbackUri}`,
            );
            const {
                statusCode,
                // headers: hdrs,
                // trailers,
                body,
            } = await request(outgoing.fallbackUri, reqOptions);

            // Remote responds but with an http error code
            const resError = statusCode !== 200;
            if (resError) {
                timer({
                    labels: {
                        status: 'failure',
                    },
                });

                this.#log.warn(
                    `remote resource responded with non 200 http status code for fallback content - code: ${statusCode} - resource: ${outgoing.name} - url: ${outgoing.fallbackUri}`,
                );

                outgoing.fallback = '';
                return outgoing;
            }

            // Response is OK. Store response body as fallback html for caching
            timer({
                labels: {
                    status: 'success',
                },
            });

            // Set fallback to the fetched content
            outgoing.fallback = await body.text();

            this.#log.debug(
                `successfully read fallback from remote resource - resource: ${outgoing.name} - url: ${outgoing.fallbackUri}`,
            );
            return outgoing;
        } catch (error) {
            timer({
                labels: {
                    status: 'failure',
                },
            });

            this.#log.warn(
                `could not create network connection to remote resource for fallback content - resource: ${outgoing.name} - url: ${outgoing.fallbackUri}`,
            );

            outgoing.fallback = '';
            return outgoing;
        }
    }

    get [Symbol.toStringTag]() {
        return 'PodletClientFallbackResolver';
    }
}
