'use strict';

const EventEmitter = require('events');
const stream = require('stream');
const assert = require('assert');
const utils = require('./utils');

module.exports = class State extends EventEmitter {
    constructor(registry, options = {}, reqOptions, streamThrough = true) {
        super();

        assert(
            registry,
            'you must pass a "registry" object to the State constructor'
        );
        assert(
            options.uri,
            'you must pass a URI in "options.uri" to the State constructor'
        );

        // Reference to the registry
        this.registry = registry;

        // URI to manifest
        this.uri = options.uri;

        // Agent to use on all requests
        this.agent = options.agent || undefined;

        // In the case of failure, should the resource throw or not
        this.throwable = options.throwable || false;

        // How long the manifest should be cached before refetched
        this.maxAge = options.maxAge || undefined;

        // Options to be appended to the content request
        this.reqOptions = Object.assign(
            { pathname: '', query: {} },
            reqOptions
        );

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

        // Kill switch for the recursive promise chain
        // Set to true when content is served
        this.success = false;
    }

    get status() {
        return this._status;
    }

    set status(value) {
        this._status = value;
        if (value === 'stale') {
            this._manifest = {
                _fallback: '',
            };
        }
    }

    get manifest() {
        return this._manifest;
    }

    set manifest(obj) {
        this._manifest = Object.assign(this._manifest, obj);
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
        let uri = this.manifest.fallback;
        if (utils.uriIsRelative(uri)) {
            uri = utils.uriBuilder(uri, this.uri);
        }
        return uri;
    }

    get contentUri() {
        let uri = this.manifest.content;
        if (utils.uriIsRelative(uri)) {
            uri = utils.uriBuilder(uri, this.uri, this.reqOptions.pathname);
        }
        return uri;
    }

    fallbackStream(onEnd) {
        const self = this;
        const fallback = new stream.Readable({
            read() {
                this.push(self.fallback);
                this.push(null);
            },
        });
        if (onEnd) {
            fallback.on('end', onEnd);
        }
        return fallback;
    }
};
