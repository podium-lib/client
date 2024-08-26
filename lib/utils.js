import { AssetJs, AssetCss } from '@podium/utils';

/**
 * Checks if a header object has a header.
 * Will return true if the header exist and is not an empty
 * string or a string of whitespace.
 *
 * @param {object} headers
 * @param {string} header
 * @returns {boolean}
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
 * @param {object} item A changelog event object
 * @returns {boolean}
 */
export const hasManifestChange = (item) => {
    const oldVersion = item.oldVal ? item.oldVal.version : '';
    const newVersion = item.newVal ? item.newVal.version : '';
    return oldVersion !== newVersion;
};

/**
 * Check if a value is a Podium HttpIncoming object or not. If not, it
 * assume the incoming value is a context
 *
 * @param {object} incoming
 * @returns {boolean}
 */
export const validateIncoming = (incoming = {}) =>
    Object.prototype.toString.call(incoming) === '[object PodiumHttpIncoming]';

/**
 * Filter assets array based on scope.
 * If scope property is not present, asset will be included (backwards compatibility)
 * If scope property is set to "all", asset will be included.
 * If scope is set to "content" and asset scope property is set to "fallback", asset will not be included
 * If scope is set to "fallback" and asset scope property is set to "content", asset will not be included
 * @template {import("@podium/utils").AssetCss | import("@podium/utils").AssetJs} T[]
 * @param {"content" | "fallback" | "all"} scope
 * @param {T[]} assets
 * @returns {T[]}
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
    if (!Array.isArray(assets))
        throw new TypeError(
            `Asset definition must be of type array. Got ${typeof assets}`,
        );
    // filter the array of asset definitions to matchin scope or anything with all. Treat no scope the same as "all" for backwards compatibility.
    return assets.filter(
        (asset) =>
            !asset.scope || asset.scope === scope || asset.scope === 'all',
    );
};

// parse link headers in AssetCss and AssetJs objects
export const parseLinkHeaders = (headers) => {
    const links = [];

    if (!headers) return links;
    headers.split(',').forEach((link) => {
        const parts = link.split(';');
        const [href, ...rest] = parts;
        const value = href.replace(/<|>|"/g, '');

        let asset;
        if (value.endsWith('.js')) {
            asset = new AssetJs({ value });
        }
        if (value.endsWith('.css')) {
            asset = new AssetCss({ value });
        }

        for (const key of rest) {
            const [keyName, keyValue] = key.split('=');
            asset[keyName] = keyValue;
        }

        links.push(asset);
    });
    return links;
};

export const toPreloadAssetObjects = (assetObjects) => {
    return assetObjects.map((assetObject) => {
        return new AssetCss({
            type:
                assetObject instanceof AssetJs
                    ? 'application/javascript'
                    : 'text/css',
            crossorigin: !!assetObject.crossorigin,
            rel: 'preload',
            as: assetObject instanceof AssetJs ? 'script' : 'style',
            media: assetObject.media || '',
            value: assetObject.value.trim(),
        });
    });
};
