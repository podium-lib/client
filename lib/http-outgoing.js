/* eslint-disable no-underscore-dangle */

'use strict';

const { PassThrough } = require('readable-stream');
const assert = require('assert');

const _killRecursions = Symbol('podium:httpoutgoing:killrecursions');
const _killThreshold = Symbol('podium:httpoutgoing:killthreshold');
const _reqOptions = Symbol('podium:httpoutgoing:reqoptions');
const _resolveCss = Symbol('podium:httpoutgoing:resolvecss');
const _resolveJs = Symbol('podium:httpoutgoing:resolvejs');
const _throwable = Symbol('podium:httpoutgoing:throwable');
const _manifest = Symbol('podium:httpoutgoing:manifest');
const _timeout = Symbol('podium:httpoutgoing:timeout');
const _success = Symbol('podium:httpoutgoing:success');
const _headers = Symbol('podium:httpoutgoing:headers');
const _maxAge = Symbol('podium:httpoutgoing:maxage');
const _status = Symbol('podium:httpoutgoing:status');
const _name = Symbol('podium:httpoutgoing:name');
const _uri = Symbol('podium:httpoutgoing:uri');

const PodletClientHttpOutgoing = class PodletClientHttpOutgoing extends PassThrough {
    constructor(options = {}, reqOptions) {
        super();

        assert(
            options.uri,
            'you must pass a URI in "options.uri" to the HttpOutgoing constructor',
        );

        // Kill switch for breaking the recursive promise chain
        // in case it is never able to completely resolve
        this[_killRecursions] = 0;
        this[_killThreshold] = options.retries || 4;

        // Options to be appended to the content request
        this[_reqOptions] = Object.assign(
            { pathname: '', query: {}, headers: {} },
            reqOptions,
        );

        // If relative CSS/JS paths should be resolved into an absolute
        // path based on the URI to the podlets manifest
        this[_resolveCss] = options.resolveCss || false;
        this[_resolveJs] = options.resolveJs || false;

        // In the case of failure, should the resource throw or not
        this[_throwable] = options.throwable || false;

        // Manifest which is either retrieved from the registry or
        // remote podlet (in other words its not saved in registry yet)
        this[_manifest] = {
            _fallback: '',
        };

        // How long before a request should time out
        this[_timeout] = options.timeout || undefined;

        // Done indicator to break the promise chain
        // Set to true when content is served
        this[_success] = false;

        // How long the manifest should be cached before refetched
        this[_maxAge] = options.maxAge || undefined;

        // What status the manifest is in. This is used to tell what actions need to
        // be performed throughout the resolving process to complete a request.
        //
        // The different statuses can be:
        // "empty" - there is no manifest available - we are in process of fetching it
        // "fresh" - the manifest has been fetched but is not stored in cache yet
        // "cached" - the manifest was retrieved from cache
        // "stale" - the manifest is outdated, a new manifest needs to be fetched
        this[_status] = 'empty';

        // Name of the resource (name given to client)
        this[_name] = options.name || '';

        // URI to manifest
        this[_uri] = options.uri;
    }

    get [Symbol.toStringTag]() {
        return 'PodletClientHttpOutgoing';
    }

    get reqOptions() {
        return this[_reqOptions];
    }

    get resolveCss() {
        return this[_resolveCss];
    }

    get resolveJs() {
        return this[_resolveJs];
    }

    get throwable() {
        return this[_throwable];
    }

    get manifest() {
        return this[_manifest];
    }

    set manifest(obj) {
        this[_manifest] = obj;
    }

    get fallback() {
        return this[_manifest]._fallback;
    }

    set fallback(value) {
        this[_manifest]._fallback = value;
    }

    get timeout() {
        return this[_timeout];
    }

    get success() {
        return this[_success];
    }

    set success(value) {
        this[_success] = value;
    }

    get headers() {
        return this[_headers];
    }

    set headers(value) {
        this[_headers] = value;
    }

    get maxAge() {
        return this[_maxAge];
    }

    set maxAge(value) {
        this[_maxAge] = value;
    }

    get status() {
        return this[_status];
    }

    set status(value) {
        this[_status] = value;
    }

    get name() {
        return this[_name];
    }

    get manifestUri() {
        return this[_uri];
    }

    get fallbackUri() {
        return this[_manifest].fallback;
    }

    get contentUri() {
        return this[_manifest].content;
    }

    get kill() {
        return this[_killRecursions] === this[_killThreshold];
    }

    get recursions() {
        return this[_killRecursions];
    }

    set recursions(value) {
        this[_killRecursions] = value;
    }

    pushFallback() {
        this.push(this[_manifest]._fallback);
        this.push(null);
    }
};
module.exports = PodletClientHttpOutgoing;
