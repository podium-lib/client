/* eslint-disable no-underscore-dangle */
/* eslint-disable import/order */

'use strict';

const util = require('util');

const _content = Symbol('podium:client:response:content');
const _headers = Symbol('podium:client:response:headers');
const _css = Symbol('podium:client:response:css');
const _js = Symbol('podium:client:response:js');
const _statusCode = Symbol('podium:client:response:statuscode');

const PodiumClientResponse = class PodiumClientResponse {
    constructor({
        content = '',
        headers = {},
        css = [],
        js = [],
        statusCode = null,
    } = {}) {
        this[_content] = content;
        this[_headers] = headers;
        this[_css] = css;
        this[_js] = js;
        this[_statusCode] = statusCode;
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

    get statusCode() {
        return this[_statusCode];
    }

    get [Symbol.toStringTag]() {
        return 'PodiumClientResponse';
    }

    toJSON() {
        return {
            content: this[_content],
            headers: this[_headers],
            css: this[_css],
            js: this[_js],
            statusCode: this[_statusCode],
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
