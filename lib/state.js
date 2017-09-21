'use strict';

const EventEmitter = require('events');
const stream = require('stream');

module.exports = class State extends EventEmitter {
    constructor(registry, options, reqOptions, streamThrough = true) {
        super();
        const self = this;

        // Reference to the registry
        this.registry = registry;

        // Agent to use on all requests
        this.agent = options && options.agent ? options.agent : undefined;

        // URI to manifest
        this.uri = options && options.uri ? options.uri : '';

        // Manifest which is either retrieved from the registry or
        // remote podlet (in other words its not saved in registry yet)
        // eslint-disable-next-line no-unused-expressions
        this.manifest;

        // Fallback content
        this.fallback = '';

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
