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

export const isHeaderDefined = (headers, header) => {
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

export const hasManifestChange = item => {
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
export const validateIncoming = (incoming = {}) => (Object.prototype.toString.call(incoming) === '[object PodiumHttpIncoming]');

/**
 * @typedef {import("@podium/utils").AssetCss | import("@podium/utils").AssetJs} Asset
 */

/**
 * Filter assets array based on scope.
 * If scope property is not present, asset will be included (backwards compatibility)
 * If scope property is set to "all", asset will be included.
 * If scope is set to "content" and asset scope property is set to "fallback", asset will not be included
 * If scope is set to "fallback" and asset scope property is set to "content", asset will not be included
 * @param {"content" | "fallback" | "all"} scope
 * @param {Asset[]} assets
 * @returns {Asset[]}
 *
 * @example
 * ```
 * // plain objects work
 * const assets = filterAssets("content", [{..., scope: "content"}, {..., scope: "fallback"}]);
 * // as do AssetJs and AssetCSS objects
 * const assets = filterAssets("content", [new AssetCss(), new AssetCss()]);
 * ```
 */
export const filterAssets = (scope, assets) => {
    // if undefined or null, passthrough
    if (!assets) return assets;
    // if a non array value is given, throw
    if (!Array.isArray(assets)) throw new TypeError(`Asset definition must be of type array. Got ${typeof assets}`);
    // filter the array of asset definitions to matchin scope or anything with all. Treat no scope the same as "all" for backwards compatibility.
    return assets.filter(asset => !asset.scope || asset.scope === scope || asset.scope === "all");
};
