import CachePolicy from 'http-cache-semantics';
import { manifest as validateManifest } from '@podium/schemas';
import Metrics from '@metrics/client';
import abslog from 'abslog';
import * as utils from '@podium/utils';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import HTTP from './http.js';

const currentDirectory = dirname(fileURLToPath(import.meta.url));

const pkgJson = fs.readFileSync(
    join(currentDirectory, '../package.json'),
    'utf-8',
);
const pkg = JSON.parse(pkgJson);

const UA_STRING = `${pkg.name} ${pkg.version}`;

/**
 * @typedef {object} PodletClientManifestResolverOptions
 * @property {string} clientName
 * @property {import('abslog').AbstractLoggerOptions} [logger]
 * @property {import('./http.js').default} [http]
 */

export default class PodletClientManifestResolver {
    #log;
    #metrics;
    #histogram;
    #http;

    /**
     * @constructor
     * @param {PodletClientManifestResolverOptions} options
     */
    // @ts-expect-error Deliberate default empty options for better error messages
    constructor(options = {}) {
        this.#http = options.http || new HTTP();
        const name = options.clientName;
        this.#log = abslog(options.logger);
        this.#metrics = new Metrics();
        this.#histogram = this.#metrics.histogram({
            name: 'podium_client_resolver_manifest_resolve',
            description: 'Time taken for success/failure of manifest request',
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
     * @param {import('./http-outgoing.js').default} outgoing
     * @returns {Promise<import('./http-outgoing.js').default>}
     */
    async resolve(outgoing) {
        if (outgoing.status === 'cached') {
            return outgoing;
        }

        const headers = {
            'User-Agent': UA_STRING,
        };

        /** @type {import('./http.js').PodiumHttpClientRequestOptions} */
        const reqOptions = {
            rejectUnauthorized: outgoing.rejectUnauthorized,
            timeout: outgoing.timeout,
            method: 'GET',
            json: true,
            headers,
        };

        const timer = this.#histogram.timer({
            labels: {
                podlet: outgoing.name,
            },
        });

        this.#log.debug(
            `start reading manifest from remote resource - resource: ${outgoing.name} - url: ${outgoing.manifestUri}`,
        );

        try {
            const response = await this.#http.request(
                outgoing.manifestUri,
                reqOptions,
            );
            const { statusCode, headers: hdrs, body } = response;

            // Remote responds but with an http error code
            const resError = statusCode !== 200;
            if (resError) {
                timer({
                    labels: {
                        status: 'failure',
                    },
                });

                this.#log.warn(
                    `remote resource responded with non 200 http status code for manifest - code: ${statusCode} - resource: ${outgoing.name} - url: ${outgoing.manifestUri}`,
                );

                // Body must be consumed; https://github.com/nodejs/undici/issues/583#issuecomment-855384858
                await body.text();
                return outgoing;
            }

            const manifest = validateManifest(
                /** @type {import("@podium/schemas").PodletManifestSchema} */ (
                    await body.json()
                ),
            );

            const recoverableErrorPaths = [
                '#/properties/css/items/properties/strategy/pattern',
                '#/properties/js/items/properties/strategy/pattern',
                '#/properties/css/items/properties/scope/pattern',
                '#/properties/js/items/properties/scope/pattern',
            ];
            const isRecoverableError =
                manifest.error &&
                manifest.error.every((error) => {
                    try {
                        if (recoverableErrorPaths.includes(error.schemaPath)) {
                            return true;
                        }
                    } catch (e) {
                        this.#log.debug(e);
                        return false;
                    }
                });

            // Manifest validation error
            if (manifest.error && !isRecoverableError) {
                timer({
                    labels: {
                        status: 'failure',
                    },
                });

                this.#log.warn(
                    `could not parse manifest - resource: ${outgoing.name} - url: ${outgoing.manifestUri}`,
                );
                return outgoing;
            }

            // Manifest is valid, calculate maxAge for caching and continue
            timer({
                labels: {
                    status: 'success',
                },
            });

            const resValues = {
                status: statusCode,
                headers: hdrs,
            };

            const cachePolicy = new CachePolicy(reqOptions, resValues, {
                ignoreCargoCult: true,
            });
            const maxAge = cachePolicy.timeToLive();
            if (maxAge !== 0) {
                this.#log.debug(
                    `remote resource has cache header which yelds a max age of ${maxAge}ms, using this as cache ttl - resource: ${outgoing.name} - url: ${outgoing.manifestUri}`,
                );
                outgoing.maxAge = maxAge;
            }

            // Build absolute content and fallback URIs
            if (manifest.value.fallback !== '') {
                manifest.value.fallback = utils.uriRelativeToAbsolute(
                    manifest.value.fallback,
                    outgoing.manifestUri,
                );
            }

            manifest.value.content = utils.uriRelativeToAbsolute(
                manifest.value.content,
                outgoing.manifestUri,
            );

            // Construct css and js objects with absolute URIs
            // @ts-expect-error We assign here what will end up as PodletManifest as defined in http-outgoing.js
            manifest.value.css = manifest.value.css.map((obj) => {
                obj.value = utils.uriRelativeToAbsolute(
                    obj.value,
                    outgoing.manifestUri,
                );
                return new utils.AssetCss(obj);
            });

            // @ts-expect-error We assign here what will end up as PodletManifest as defined in http-outgoing.js
            manifest.value.js = manifest.value.js.map((obj) => {
                obj.value = utils.uriRelativeToAbsolute(
                    obj.value,
                    outgoing.manifestUri,
                );
                return new utils.AssetJs(obj);
            });

            /*
                START: Proxy backwards compabillity check and handling

                If .proxy is and Array, the podlet are of version 6 or newer. The Array is then an
                Array of proxy Objects ({ name: 'foo', target: '/' }) which is the new structure
                wanted from version 6 and onwards so leave this structure untouched.

                If .proxy is an Object, the podlet are of version 5 or older where the key of the
                Object is the key of the target. If so, convert the structure to the new structure
                consisting of an Array of proxy Objects.

                This check can be removed in version 7 (requires all podlets to be on version 6)
            */

            if (Array.isArray(manifest.value.proxy)) {
                // Build absolute proxy URIs
                manifest.value.proxy = manifest.value.proxy.map((item) => ({
                    target: utils.uriRelativeToAbsolute(
                        item.target,
                        outgoing.manifestUri,
                    ),
                    name: item.name,
                }));
            } else {
                const proxies = [];
                // Build absolute proxy URIs
                Object.keys(manifest.value.proxy).forEach((key) => {
                    proxies.push({
                        target: utils.uriRelativeToAbsolute(
                            manifest.value.proxy[key],
                            outgoing.manifestUri,
                        ),
                        name: key,
                    });
                });
                manifest.value.proxy = proxies;
            }

            /*
                END: Proxy backwards compabillity check and handling
            */

            // @ts-expect-error We map to AssetCss and AssetJs above
            outgoing.manifest = manifest.value;
            outgoing.status = 'fresh';

            this.#log.debug(
                `successfully read manifest from remote resource - resource: ${outgoing.name} - url: ${outgoing.manifestUri}`,
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
                    `request to remote manifest was aborted due to the resource failing to respond before the configured timeout (${outgoing.timeout}ms) - resource: ${outgoing.name} - url: ${outgoing.manifestUri}`,
                );
            } else {
                this.#log.warn(
                    `could not create network connection to remote manifest - resource: ${outgoing.name} - url: ${outgoing.manifestUri}`,
                );
            }
            return outgoing;
        }
    }

    get [Symbol.toStringTag]() {
        return 'PodletClientManifestResolver';
    }
}
