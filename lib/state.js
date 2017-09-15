'use strict';

const EventEmitter = require('events');
const stream = require('stream');

module.exports = class State extends EventEmitter {
    constructor(registry, resOptions, reqOptions, streamThrough = true) {
        super();
        const self = this;

        // Reference to the registry
        this.registry = registry;

        // URI to manifest
        this.uri = resOptions && resOptions.uri ? resOptions.uri : '';

        // The manifest retrieved from cache or remote podlet
        // TODO: What?
        // eslint-disable-next-line no-unused-expressions
        this.manifest;

        // Fallback content
        this.fallback = '';

        // Resource options
        this.resOptions = resOptions;

        // Options to be appended to the content request
        this.reqOptions = reqOptions;

        // Buffer for collecting content when not streaming through
        this.content = '';

        // Stream the content resource will pipe into
        this.stream = streamThrough
            ? new stream.PassThrough()
            : new stream.Writable({
                  write(chunk, encoding, next) {
                      if (chunk) {
                          self.content += chunk.toString();
                      }
                      next();
                  },
              });

        // Kill switch for the recursive promise chain
        // Set to true when content is served
        this.success = false;
    }
};
