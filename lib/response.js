/* eslint-disable no-underscore-dangle */
/* eslint-disable import/order */

'use strict';

const util = require('util');

const _redirect = Symbol('podium:client:response:redirect');
const _content = Symbol('podium:client:response:content');
const _headers = Symbol('podium:client:response:headers');
const _css = Symbol('podium:client:response:css');
const _js = Symbol('podium:client:response:js');

const PodiumClientResponse = class PodiumClientResponse {
    constructor({
        content = '',
        headers = {},
        css = [],
        js = [],
        redirect = null,
    } = {}) {
        this[_redirect] = redirect;
        this[_content] = content;
        this[_headers] = headers;
        this[_css] = css;
        this[_js] = js;
    }

    get content() {
        return this[_content];
    }

    get headers() {
        return this[_headers];
    }

    get css() {
        return this[_css];
    }

    get js() {
        return this[_js];
    }

    get redirect() {
        return this[_redirect];
    }

    get [Symbol.toStringTag]() {
        return 'PodiumClientResponse';
    }

    toJSON() {
        return {
            redirect: this[_redirect],
            content: this[_content],
            headers: this[_headers],
            css: this[_css],
            js: this[_js],
        };
    }

    toString() {
        return this[_content];
    }

    [Symbol.toPrimitive]() {
        return this[_content];
    }

    [util.inspect.custom](depth, options) {
        return util.inspect(this.toJSON(), depth, options);
    }
};
module.exports = PodiumClientResponse;
