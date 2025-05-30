import { pipeline } from 'stream';
import Metrics from '@metrics/client';
import abslog from 'abslog';
import * as putils from '@podium/utils';
import { Boom, badGateway } from '@hapi/boom';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import * as utils from './utils.js';
import Response from './response.js';
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
 * @typedef {object} PodletClientContentResolverOptions
 * @property {string} clientName
 * @property {import('./http.js').default} [http]
 * @property {import('abslog').AbstractLoggerOptions} [logger]
 */

export default class PodletClientContentResolver {
    #log;
    #metrics;
    #histogram;
    #http;

    /**
     * @constructor
     * @param {PodletClientContentResolverOptions} options
     */
    // @ts-expect-error Deliberate default empty options for better error messages
    constructor(options = {}) {
        this.#http = options.http || new HTTP();
        const name = options.clientName;
        this.#log = abslog(options.logger);
        this.#metrics = new Metrics();
        this.#histogram = this.#metrics.histogram({
            name: 'podium_client_resolver_content_resolve',
            description: 'Time taken for success/failure of content request',
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
     * Resolves/fetches the podlet's content.
     *
     * @param {import('./http-outgoing.js').default} outgoing
     * @returns {Promise<import('./http-outgoing.js').default>}
     */
    async resolve(outgoing) {
        if (outgoing.kill && outgoing.throwable) {
            this.#log.warn(
                `recursion detected - failed to resolve fetching of podlet ${outgoing.recursions} times - throwing - resource: ${outgoing.name} - url: ${outgoing.manifestUri}`,
            );
            throw badGateway(
                `Recursion detected - failed to resolve fetching of podlet ${outgoing.recursions} times`,
            );
        }

        if (outgoing.kill) {
            this.#log.warn(
                `recursion detected - failed to resolve fetching of podlet ${outgoing.recursions} times - serving fallback - resource: ${outgoing.name} - url: ${outgoing.manifestUri}`,
            );
            outgoing.success = true;
            outgoing.pushFallback();
            outgoing.emit(
                'beforeStream',
                new Response({ js: outgoing.js, css: outgoing.css }),
            );
            return outgoing;
        }

        if (outgoing.status === 'empty' && outgoing.throwable) {
            this.#log.warn(
                `no manifest available - cannot read content - throwing - resource: ${outgoing.name} - url: ${outgoing.manifestUri}`,
            );
            throw badGateway(`No manifest available - Cannot read content`);
        }

        if (outgoing.status === 'empty') {
            this.#log.warn(
                `no manifest available - cannot read content - serving fallback - resource: ${outgoing.name} - url: ${outgoing.manifestUri}`,
            );
            outgoing.success = true;
            outgoing.pushFallback();
            outgoing.emit(
                'beforeStream',
                new Response({ js: outgoing.js, css: outgoing.css }),
            );
            return outgoing;
        }

        const headers = {
            ...outgoing.reqOptions.headers,
            'User-Agent': UA_STRING,
        };

        putils.serializeContext(headers, outgoing.context, outgoing.name);

        const uri = putils.uriBuilder(
            outgoing.reqOptions.pathname,
            outgoing.contentUri,
        );

        /** @type {import('./http.js').PodiumHttpClientRequestOptions} */
        const reqOptions = {
            rejectUnauthorized: outgoing.rejectUnauthorized,
            timeout: outgoing.timeout,
            method: 'GET',
            query: outgoing.reqOptions.query,
            headers,
        };

        if (outgoing.redirectable) {
            reqOptions.follow = false;
        }

        const timer = this.#histogram.timer({
            labels: {
                podlet: outgoing.name,
            },
        });

        this.#log.debug(
            `start reading content from remote resource - manifest version is ${outgoing.manifest.version} - resource: ${outgoing.name} - url: ${uri}`,
        );

        try {
            const {
                statusCode,
                headers: hdrs,
                body,
            } = await this.#http.request(uri, reqOptions);

            const parsedAssetObjects = parseLinkHeaders(
                hdrs.link,
                outgoing.manifestUri,
            );

            const scriptObjects = parsedAssetObjects.filter(
                (asset) => asset instanceof AssetJs,
            );
            const styleObjects = parsedAssetObjects.filter(
                (asset) => asset instanceof AssetCss,
            );
            // set the content js asset objects
            outgoing.js = filterAssets('content', scriptObjects);
            // set the content css asset objects
            outgoing.css = filterAssets('content', styleObjects);

            // Remote responds but with an http error code
            const resError = statusCode >= 400;
            if (resError && outgoing.throwable) {
                timer({
                    labels: {
                        status: 'failure',
                        statusCode,
                    },
                });

                this.#log.debug(
                    `remote resource responded with non 200 http status code for content - code: ${statusCode} - resource: ${outgoing.name} - url: ${uri}`,
                );

                const errorMessage = `Could not read content. Resource responded with ${statusCode} on ${uri}`;

                const errorOptions = {
                    statusCode,
                    decorate: {
                        statusCode,
                    },
                };

                // Body must be consumed; https://github.com/nodejs/undici/issues/583#issuecomment-855384858
                await body.text();
                throw new Boom(errorMessage, errorOptions);
            }
            if (resError) {
                timer({
                    labels: {
                        status: 'failure',
                        statusCode,
                    },
                });

                this.#log.debug(
                    `remote resource responded with non 200 http status code for content - code: ${statusCode} - resource: ${outgoing.name} - url: ${uri}`,
                );
                outgoing.success = true;
                outgoing.pushFallback();
                outgoing.emit(
                    'beforeStream',
                    new Response({ js: outgoing.js, css: outgoing.css }),
                );

                // Body must be consumed; https://github.com/nodejs/undici/issues/583#issuecomment-855384858
                await body.text();
                return outgoing;
            }

            const contentVersion = utils.isHeaderDefined(hdrs, 'podlet-version')
                ? hdrs['podlet-version']
                : undefined;

            this.#log.debug(
                `got head response from remote resource for content - header version is ${hdrs['podlet-version']} - resource: ${outgoing.name} - url: ${uri}`,
            );

            if (
                contentVersion !== outgoing.manifest.version &&
                contentVersion !== undefined
            ) {
                timer({
                    labels: {
                        status: 'success',
                        statusCode,
                    },
                });

                this.#log.info(
                    `podlet version number in header differs from cached version number - aborting request to remote resource for content - resource: ${outgoing.name} - url: ${uri}`,
                );

                outgoing.status = 'stale';
                return outgoing;
            }

            outgoing.success = true;
            outgoing.headers = hdrs;

            if (outgoing.redirectable && statusCode >= 300) {
                outgoing.redirect = {
                    statusCode,
                    // @ts-expect-error TODO: look into what happens if the podlet returns more than one location header
                    location: hdrs && hdrs.location,
                };
            }

            outgoing.emit(
                'beforeStream',
                new Response({
                    headers: outgoing.headers,
                    js: outgoing.js,
                    css: outgoing.css,
                    redirect: outgoing.redirect,
                }),
            );

            // @ts-ignore
            pipeline([body, outgoing], (err) => {
                if (err) {
                    this.#log.warn('error while piping content stream', err);
                }
            });

            timer({
                labels: {
                    status: 'success',
                    statusCode,
                },
            });
        } catch (error) {
            if (error.isBoom) throw error;

            if (error.name === 'AbortError') {
                this.#log.warn(
                    `request to remote resource for content was aborted due to the resource failing to respond before the configured timeout (${outgoing.timeout}ms) - resource: ${outgoing.name} - url: ${uri}`,
                );
            } else {
                this.#log.warn(
                    `could not create network connection to remote resource when trying to request content - resource: ${outgoing.name} - url: ${uri}`,
                );
            }

            timer({
                labels: {
                    status: 'failure',
                    statusCode: error.statusCode || 500,
                },
            });

            // Network error
            if (outgoing.throwable) {
                throw badGateway(`Error reading content at ${uri}`);
            }

            outgoing.success = true;

            outgoing.pushFallback();
            outgoing.emit(
                'beforeStream',
                new Response({ js: outgoing.js, css: outgoing.css }),
            );

            return outgoing;
        }

        this.#log.debug(
            `successfully read content from remote resource - resource: ${outgoing.name} - url: ${uri}`,
        );

        return outgoing;
    }

    get [Symbol.toStringTag]() {
        return 'PodletClientContentResolver';
    }
}
