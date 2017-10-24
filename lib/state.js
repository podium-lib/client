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

        // Manifest which is either retrieved from the registry or
        // remote podlet (in other words its not saved in registry yet)
        // eslint-disable-next-line no-unused-expressions
        this.manifest;

        // Fallback content
        this.fallback = '';

        // Buffer for collecting content when not streaming through
        this.content = '';

        // Stream the content resource will pipe into
        this.stream = streamThrough
            ? new stream.PassThrough()
            : new stream.Writable({
                  write: (chunk, encoding, next) => {
                      if (chunk) {
                          this.content += chunk.toString();
                      }
                      next();
                  },
              });

        // Kill switch for the recursive promise chain
        // Set to true when content is served
        this.success = false;
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
};
