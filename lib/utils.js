'use strict';

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

