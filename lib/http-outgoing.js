/* eslint-disable no-underscore-dangle */

import { PassThrough } from 'stream';
import assert from 'assert';

export default class PodletClientHttpOutgoing extends PassThrough {
    #rejectUnauthorized;
    #killRecursions;
    #killThreshold;
    #redirectable;
    #reqOptions;
    #isFallback;
    #throwable;
    #manifest;
    #incoming;
    #redirect;
    #timeout;
    #success;
    #headers;
    #maxAge;
    #status;
    #name;
    #uri;    
    constructor(
        {
            rejectUnauthorized = true,
            throwable = false,
            redirectable = false,
            retries = 4,
            timeout,
            maxAge,
            name = '',
            uri,
        } = {},
        reqOptions,
        incoming,
    ) {
        super();

        assert(
            uri,
            'you must pass a URI in "options.uri" to the HttpOutgoing constructor',
        );

        // If requests to https sites should reject on unsigned sertificates
        this.#rejectUnauthorized = rejectUnauthorized;

        // A HttpIncoming object
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

        // What status the manifest is in. This is used to tell what actions need to
        // be performed throughout the resolving process to complete a request.
        //
        // The different statuses can be:
        // "empty" - there is no manifest available - we are in process of fetching it
        // "fresh" - the manifest has been fetched but is not stored in cache yet
        // "cached" - the manifest was retrieved from cache
        // "stale" - the manifest is outdated, a new manifest needs to be fetched
        this.#status = 'empty';

        // Name of the resource (name given to client)
        this.#name = name;

        // URI to manifest
        this.#uri = uri;

        // Whether the user can handle redirects manually.
        this.#redirectable = redirectable;

        // When redirectable is true, this object should be populated with redirect information
        // such that a user can perform manual redirection
        this.#redirect = null;

        // When isfallback is true, content fetch has failed and fallback will be served instead
        this.#isFallback = false;
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
        return this.#manifest._fallback;
    }

    set fallback(value) {
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

    get kill() {
        return this.#killRecursions === this.#killThreshold;
    }

    get recursions() {
        return this.#killRecursions;
    }

    set recursions(value) {
        this.#killRecursions = value;
    }

    get redirect() {
        return this.#redirect;
    }

    set redirect(value) {
        this.#redirect = value;
    }

    get redirectable() {
        return this.#redirectable;
    }

    set redirectable(value) {
        this.#redirectable = value;
    }

    /**
     * Boolean getter that indicates whether the client is responding with a content or fallback payload.
     * @example
     * ```
     * if (outgoing.isFallback) console.log("Fallback!");
     * ```
     */
    get isFallback() {
      return this.#isFallback;
    }

    pushFallback() {
        this.push(this.#manifest._fallback);
        this.push(null);
        this.#isFallback = true;
    }

    get [Symbol.toStringTag]() {
        return 'PodletClientHttpOutgoing';
    }
};
