const inspect = Symbol.for('nodejs.util.inspect.custom');

/**
 * @typedef {object} PodiumClientResponseOptions
 * @property {string} [content]
 * @property {object} [headers]
 * @property {Array<import('@podium/utils').AssetJs>} [js]
 * @property {Array<import('@podium/utils').AssetCss>} [css]
 * @property {import('./http-outgoing.js').PodiumRedirect | null} [redirect]
 */

export default class PodiumClientResponse {
    #redirect;
    #content;
    #headers;
    #css;
    #js;

    /**
     * @constructor
     * @param {PodiumClientResponseOptions} options
     */
    constructor({
        content = '',
        headers = {},
        css = [],
        js = [],
        redirect = null,
    } = {}) {
        this.#redirect = redirect;
        this.#content = content;
        this.#headers = headers;
        this.#css = css;
        this.#js = js;
    }

    get content() {
        return this.#content;
    }

    get headers() {
        return this.#headers;
    }

    get css() {
        return this.#css;
    }

    get js() {
        return this.#js;
    }

    get redirect() {
        return this.#redirect;
    }

    toJSON() {
        return {
            redirect: this.redirect,
            content: this.content,
            headers: this.headers,
            css: this.css.map((a) => a.toJSON()),
            js: this.js.map((a) => a.toJSON()),
        };
    }

    toString() {
        return this.content;
    }

    [Symbol.toPrimitive]() {
        return this.content;
    }

    [inspect]() {
        return {
            redirect: this.redirect,
            content: this.content,
            headers: this.headers,
            css: this.css,
            js: this.js,
        };
    }

    get [Symbol.toStringTag]() {
        return 'PodiumClientResponse';
    }
}
