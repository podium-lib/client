const inspect = Symbol.for('nodejs.util.inspect.custom');

export default class PodiumClientResponse {
    #redirect;
    #content;
    #headers;
    #css;
    #js;
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
            css: this.css,
            js: this.js,
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
            referrerpolicy: this.referrerpolicy,
            crossorigin: this.crossorigin,
            integrity: this.integrity,
            nomodule: this.nomodule,
            value: this.value,
            async: this.async,
            defer: this.defer,
            type: this.type,
            data: this.data,
        };
    }

    get [Symbol.toStringTag]() {
        return 'PodiumClientResponse';
    }
};
// module.exports = PodiumClientResponse;
