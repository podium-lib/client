'use strict';

const stream = require('readable-stream');


module.exports = class State {
    constructor(registry, uri, reqOptions, streamThrough = true) {
        const self = this;

        // Reference to the registry
        this.registry = registry;

        // URI to manifest
        this.uri = uri;

        // The manifest retrieved from cache or remote podlet
        this.manifest;

        // Fallback content
        this.fallback = '';

        // Options to be appended to the content request
        this.reqOptions = reqOptions;

        // Buffer for collecting content when not streaming through
        this.content;

        // Stream the content resource will pipe into
        this.stream = streamThrough ? new stream.PassThrough() : new stream.Writable({
            write(chunk, encoding, next) {
                if (chunk) {
                    self.content += chunk.toString();
                }
                next()
            }
        });
    }
}
