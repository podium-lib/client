import abslog from 'abslog';
import Metrics from '@metrics/client';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import HTTP from './http.js';
import { parseLinkHeaders, filterAssets } from './utils.js';
import { AssetJs, AssetCss } from '@podium/utils';

const currentDirectory = dirname(fileURLToPath(import.meta.url));

const pkgJson = fs.readFileSync(
    join(currentDirectory, '../package.json'),
    'utf-8',
);
const pkg = JSON.parse(pkgJson);

const UA_STRING = `${pkg.name} ${pkg.version}`;

/**
 * @typedef {object} PodletClientFallbackResolverOptions
 * @property {string} clientName
 * @property {import('./http.js').default} [http]
 * @property {import('abslog').AbstractLoggerOptions} [logger]
 */

export default class PodletClientFallbackResolver {
    #log;
    #metrics;
    #histogram;
    #http;

    /**
     * @constructor
     * @param {PodletClientFallbackResolverOptions} options
     */
    // @ts-expect-error Deliberate default empty options for better error messages
    constructor(options = {}) {
        this.#http = options.http || new HTTP();
        const name = options.clientName;
        this.#log = abslog(options.logger);
        this.#metrics = new Metrics();
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

    /**
     * Resolves/fetches the podlet's fallback.
     *
     * @param {import('./http-outgoing.js').default} outgoing
     * @returns {Promise<import('./http-outgoing.js').default>}
     */
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

        /** @type {import('./http.js').PodiumHttpClientRequestOptions} */
        const reqOptions = {
            rejectUnauthorized: outgoing.rejectUnauthorized,
            timeout: outgoing.timeout,
            method: 'GET',
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
                body,
                headers: resHeaders,
            } = await this.#http.request(outgoing.fallbackUri, reqOptions);

            const parsedAssetObjects = parseLinkHeaders(resHeaders.link);

            const scriptObjects = parsedAssetObjects.filter(
                (asset) => asset instanceof AssetJs,
            );
            const styleObjects = parsedAssetObjects.filter(
                (asset) => asset instanceof AssetCss,
            );
            // set the content js asset fallback objects
            // @ts-expect-error internal property
            outgoing.manifest._js = filterAssets('fallback', scriptObjects);
            // set the fallback css asset fallback objects
            // @ts-expect-error internal property
            outgoing.manifest._css = filterAssets('fallback', styleObjects);

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

                // Body must be consumed; https://github.com/nodejs/undici/issues/583#issuecomment-855384858
                await body.text();
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

            if (error.name === 'AbortError') {
                this.#log.warn(
                    `request to read fallback was aborted due to the resource failing to respond before the configured timeout (${outgoing.timeout}ms) - resource: ${outgoing.name} - url: ${outgoing.fallbackUri}`,
                );
            } else {
                this.#log.warn(
                    `could not create network connection to remote resource for fallback - resource: ${outgoing.name} - url: ${outgoing.fallbackUri}`,
                );
            }

            outgoing.fallback = '';
            return outgoing;
        }
    }

    get [Symbol.toStringTag]() {
        return 'PodletClientFallbackResolver';
    }
}
