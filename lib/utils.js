'use strict';

const { HttpIncoming } = require('@podium/utils');

/**
 * Checks if a header Oject has a header.
 * Will return true if the header exist and are not an empty
 * String or a String of whitespace.
 *
 * @param {Object} headers A headers object
 * @param {String} header A header value
 *
 * @returns {Boolean}
 */

module.exports.isHeaderDefined = (headers, header) => {
    if (headers[header] === undefined || headers[header].trim() === '') {
        return false;
    }
    return true;
};

/**
 * Check if there is a difference between two manifests in
 * the changelog event object emitted from the internal
 * cache registry.
 *
 * @param {Object} item A changelog event object
 *
 * @returns {Boolean}
 */

module.exports.hasManifestChange = item => {
    const oldVersion = item.oldVal ? item.oldVal.version : '';
    const newVersion = item.newVal ? item.newVal.version : '';
    return oldVersion !== newVersion;
};

/**
 * Check if a value is a HttpIncoming object or not. If not, it
 * assume the incoming value is a context
 *
 * @param {Object} incoming A object
 *
 * @returns {HttpIncoming}
 */

function incomingDeprecated() {
    if (!incomingDeprecated.warned) {
        incomingDeprecated.warned = true;
        process.emitWarning(
            'Passing an arbitrary value as the first argument to .fetch() and .stream() is deprecated. In a future version it will be required to pass in a HttpIncoming object as a the first argument to these methods. For further information and how to migrate, please see https://podium-lib.io/blog/2019/06/14/version-4.0.0#httpincoming-replaces-context-argument',
            'DeprecationWarning',
        );
    }
}

module.exports.validateIncoming = (incoming = {}) => {
    if (
        Object.prototype.toString.call(incoming) ===
        '[object PodiumHttpIncoming]'
    ) {
        return incoming;
    }

    incomingDeprecated();

    const inc = new HttpIncoming({
        headers: {},
    });
    inc.context = incoming;
    return inc;
};
