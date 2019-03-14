/* eslint-disable no-underscore-dangle */

'use strict';

const stream = require('readable-stream');
const assert = require('assert');

module.exports = class PodletClientState {
    constructor(options = {}, reqOptions, streamThrough = true) {
        assert(
            options.uri,
            'you must pass a URI in "options.uri" to the State constructor',
        );

        // URI to manifest
        this.uri = options.uri;

        // Name of the resource (name given to client)
        this.resourceName = options.name;

        // In the case of failure, should the resource throw or not
        this.throwable = options.throwable || false;

        // How long the manifest should be cached before refetched
        this.maxAge = options.maxAge || undefined;

        // How long before a request should time out
        this.timeout = options.timeout || undefined;

        // Options to be appended to the content request
        this.reqOptions = Object.assign(
            { pathname: '', query: {}, headers: {} },
            reqOptions,
        );

        // If relative CSS/JS paths should be resolved into an absolute
        // path based on the URI to the podlets manifest
        this.resolveCss = options.resolveCss || false;
        this.resolveJs = options.resolveJs || false;

        // What status the manifest is in. This is used to tell what actions need to
        // be performed throughout the resolving process to complete a request.
        //
        // The different statuses can be:
        // "empty" - there is no manifest available - we are in process of fetching it
        // "fresh" - the manifest has been fetched but is not stored in cache yet
        // "cached" - the manifest was retrieved from cache
        // "stale" - the manifest is outdated, a new manifest needs to be fetched
        this._status = 'empty';

        // Manifest which is either retrieved from the registry or
        // remote podlet (in other words its not saved in registry yet)
        this._manifest = {
            _fallback: '',
        };

        // Buffer for collecting content when not streaming through
        this._buffer = [];

        // Stream the content resource will pipe into
        this.stream = streamThrough
            ? new stream.PassThrough()
            : new stream.Writable({
                  write: (chunk, encoding, next) => {
                      this._buffer.push(chunk);
                      next();
                  },
              });

        // Kill switch for breaking the recursive promise chain
        // in case it is never able to completely resolve
        this.killRecursions = 0;
        this.killThreshold = options.retries || 4;

        // Done indicator to break the promise chain
        // Set to true when content is served
        this.success = false;
    }

    get [Symbol.toStringTag]() {
        return 'PodletClientState';
    }

    get status() {
        return this._status;
    }

    set status(value) {
        this._status = value;
    }

    get manifest() {
        return this._manifest;
    }

    set manifest(obj) {
        this._manifest = obj;
    }

    get fallback() {
        return this._manifest._fallback;
    }

    set fallback(value) {
        this._manifest._fallback = value;
    }

    get content() {
        return Buffer.concat(this._buffer).toString();
    }

    get manifestUri() {
        return this.uri;
    }

    get fallbackUri() {
        return this.manifest.fallback;
    }

    get contentUri() {
        return this.manifest.content;
    }

    fallbackStream() {
        const self = this;
        return new stream.Readable({
            read() {
                this.push(self.fallback);
                this.push(null);
            },
        });
    }
};
