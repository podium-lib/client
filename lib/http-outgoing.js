/* eslint-disable no-underscore-dangle */

import { PassThrough } from 'stream';
import assert from 'assert';

/**
 * @typedef {object} PodiumClientHttpOutgoingOptions
 * @property {string} name
 * @property {string} uri To the podlet's `manifest.json`
 * @property {number} timeout In milliseconds
 * @property {number} maxAge
 * @property {number} [retries=4]
 * @property {boolean} [throwable=false]
 * @property {boolean} [redirectable=false]
 * @property {boolean} [rejectUnauthorized=true]
 * @property {import('http').Agent} [httpAgent]
 * @property {import('https').Agent} [httpsAgent]
 */

/**
 * @typedef {object} PodiumClientResourceOptions
 * @property {string} [pathname]
 * @property {import('http').IncomingHttpHeaders} [headers]
 * @property {object} [query]
 */

/**
 * @typedef {object} PodiumRedirect
 * @property {number} statusCode;
 * @property {string} location;
 */

/**
 * @typedef {object} PodletProxySchema
 * @property {string} target
 * @property {string} name
 */

/**
 * @typedef {object} PodletManifest Similar to the schema's manifest, but with instances of AssetCss and AssetJs from `@podium/utils` and default values.
 * @property {string} name
 * @property {string} version
 * @property {string} content
 * @property {string} fallback
 * @property {Array<import('@podium/utils').AssetJs>} js
 * @property {Array<import('@podium/utils').AssetCss>} css
 * @property {Record<string, string> | Array<PodletProxySchema>} proxy
 * @property {string} team
 */

export default class PodletClientHttpOutgoing extends PassThrough {
    #rejectUnauthorized;
    #killRecursions;
    #killThreshold;
    #redirectable;
    #reqOptions;
    #isFallback = false;
    #throwable;
    /** @type {PodletManifest} */
    #manifest;
    #incoming;
    /** @type {null | PodiumRedirect} */
    #redirect = null;
    #timeout;
    #success;
    #headers;
    #maxAge;
    /** @type {'empty' | 'fresh' | 'cached' | 'stale'} */
    #status;
    #name;
    #uri;

    /**
     * @constructor
     * @param {PodiumClientHttpOutgoingOptions} options
     * @param {PodiumClientResourceOptions} [reqOptions]
     * @param {import('@podium/utils').HttpIncoming} [incoming]
     */
    // @ts-expect-error Deliberate default empty options for better error messages
    constructor(options = {}, reqOptions, incoming) {
        super();

        const {
            rejectUnauthorized = true,
            throwable = false,
            redirectable = false,
            retries = 4,
            timeout,
            maxAge,
            name = '',
            uri,
        } = options;

        assert(
            uri,
            'you must pass a URI in "options.uri" to the HttpOutgoing constructor',
        );

        // If requests to https sites should reject on unsigned sertificates
        this.#rejectUnauthorized = rejectUnauthorized;

        this.#incoming = incoming;

        // Kill switch for breaking the recursive promise chain
        // in case it is never able to completely resolve
        this.#killRecursions = 0;
        this.#killThreshold = retries;

        // Options to be appended to the content request
        this.#reqOptions = {
            pathname: '',
            query: {},
            headers: {},
            ...reqOptions,
        };

        // In the case of failure, should the resource throw or not
        this.#throwable = throwable;

        // Manifest which is either retrieved from the registry or
        // remote podlet (in other words its not saved in registry yet)
        this.#manifest = {
            // @ts-expect-error Internal property
            _fallback: '',
        };

        // How long before a request should time out
        this.#timeout = timeout;

        // Done indicator to break the promise chain
        // Set to true when content is served
        this.#success = false;

        this.#headers = {};

        // How long the manifest should be cached before refetched
        this.#maxAge = maxAge;

        this.#status = 'empty';

        // Name of the resource (name given to client)
        this.#name = name;

        // URI to manifest
        this.#uri = uri;

        // Whether the user can handle redirects manually.
        this.#redirectable = redirectable;
    }

    get rejectUnauthorized() {
        return this.#rejectUnauthorized;
    }

    get reqOptions() {
        return this.#reqOptions;
    }

    get throwable() {
        return this.#throwable;
    }

    get manifest() {
        return this.#manifest;
    }

    set manifest(obj) {
        this.#manifest = obj;
    }

    get fallback() {
        // @ts-expect-error Internal property
        return this.#manifest._fallback;
    }

    set fallback(value) {
        // @ts-expect-error Internal property
        this.#manifest._fallback = value;
    }

    get timeout() {
        return this.#timeout;
    }

    get success() {
        return this.#success;
    }

    set success(value) {
        this.#success = value;
    }

    get context() {
        return this.#incoming.context;
    }

    get headers() {
        return this.#headers;
    }

    set headers(value) {
        this.#headers = value;
    }

    get maxAge() {
        return this.#maxAge;
    }

    set maxAge(value) {
        this.#maxAge = value;
    }

    /**
     * What status the manifest is in. This is used to tell what actions need to
     * be performed throughout the resolving process to complete a request.
     *
     * The different statuses can be:
     *  - `"empty"` - there is no manifest available - we are in process of fetching it
     *  - `"fresh"` - the manifest has been fetched but is not stored in cache yet
     *  - `"cached"` - the manifest was retrieved from cache
     *  - `"stale"` - the manifest is outdated, a new manifest needs to be fetched
     */
    get status() {
        return this.#status;
    }

    set status(value) {
        this.#status = value;
    }

    get name() {
        return this.#name;
    }

    get manifestUri() {
        return this.#uri;
    }

    get fallbackUri() {
        return this.#manifest.fallback;
    }

    get contentUri() {
        return this.#manifest.content;
    }

    /**
     * Kill switch for breaking the recursive promise chain in case it is never able to completely resolve.
     * This is true if the number of recursions matches the threshold.
     */
    get kill() {
        return this.#killRecursions === this.#killThreshold;
    }

    /**
     * The number of recursions before the request should be {@link kill}ed
     */
    get recursions() {
        return this.#killRecursions;
    }

    /**
     * Set the number of recursions before the request should be {@link kill}ed
     */
    set recursions(value) {
        this.#killRecursions = value;
    }

    /**
     * When {@link redirectable} is `true` this is populated with redirect information so you can send a redirect response to the browser from your layout.
     *
     * @see https://podium-lib.io/docs/layout/handling_redirects
     */
    get redirect() {
        return this.#redirect;
    }

    set redirect(value) {
        this.#redirect = value;
    }

    /**
     * Whether the podlet can signal redirects to the layout.
     *
     * @see https://podium-lib.io/docs/layout/handling_redirects
     */
    get redirectable() {
        return this.#redirectable;
    }

    set redirectable(value) {
        this.#redirectable = value;
    }

    /**
     * True if the client has returned the podlet's fallback.
     *
     * @example
     *
     * ```js
     * if (outgoing.isFallback) console.log("Fallback!");
     * ```
     *
     * @see https://podium-lib.io/docs/podlet/fallbacks
     */
    get isFallback() {
        return this.#isFallback;
    }

    pushFallback() {
        // @ts-expect-error Internal property
        this.push(this.#manifest._fallback);
        this.push(null);
        this.#isFallback = true;
    }

    get [Symbol.toStringTag]() {
        return 'PodletClientHttpOutgoing';
    }
}
