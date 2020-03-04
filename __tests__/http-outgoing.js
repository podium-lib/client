'use strict';

const { test } = require('tap');
const { destinationBufferStream } = require('@podium/test-utils');
const isStream = require('is-stream');
const HttpOutgoing = require('../lib/http-outgoing');

const REQ_OPTIONS = {
    pathname: 'a',
    query: { b: 'c' },
};
const RESOURCE_OPTIONS = {
    uri: 'http://example.org',
};

/**
 * Constructor
 */

test('HttpOutgoing() - object tag - should be PodletClientHttpOutgoing', t => {
    const outgoing = new HttpOutgoing(RESOURCE_OPTIONS);
    t.equal(
        Object.prototype.toString.call(outgoing),
        '[object PodletClientHttpOutgoing]',
    );
    t.end();
});

test('HttpOutgoing() - "options.uri" not provided to constructor - should throw', t => {
    t.throws(() => {
        // eslint-disable-next-line no-unused-vars
        const outgoing = new HttpOutgoing();
    }, 'you must pass a URI in "options.uri" to the HttpOutgoing constructor');
    t.end();
});

test('HttpOutgoing() - should be a PassThrough stream', t => {
    const outgoing = new HttpOutgoing(RESOURCE_OPTIONS, REQ_OPTIONS);
    // NOTE: PassThrough is just a transform stream pushing all chunks through. is-stream has no PassThrough check.
    t.ok(isStream.transform(outgoing));
    t.end();
});

test('HttpOutgoing() - set "uri" - should be accessable on "this.manifestUri"', t => {
    const outgoing = new HttpOutgoing(RESOURCE_OPTIONS);
    t.equal(outgoing.manifestUri, RESOURCE_OPTIONS.uri);
    t.end();
});

test('HttpOutgoing() - set "reqOptions" - should be persisted on "this.reqOptions"', t => {
    const outgoing = new HttpOutgoing(RESOURCE_OPTIONS, REQ_OPTIONS);
    t.equal(outgoing.reqOptions.pathname, 'a');
    t.equal(outgoing.reqOptions.query.b, 'c');
    t.end();
});

test('HttpOutgoing() - "this.manifest" should be {_fallback: ""}', t => {
    const outgoing = new HttpOutgoing(RESOURCE_OPTIONS, REQ_OPTIONS);
    t.same(outgoing.manifest, { _fallback: '' });
    t.end();
});

test('HttpOutgoing() - get manifestUri - should return URI to manifest', t => {
    const outgoing = new HttpOutgoing(RESOURCE_OPTIONS);
    t.equal(outgoing.manifestUri, RESOURCE_OPTIONS.uri);
    t.end();
});

test('HttpOutgoing() - call .pushFallback() - should push the fallback content on the stream', t => {
    t.plan(1);
    const outgoing = new HttpOutgoing(RESOURCE_OPTIONS, REQ_OPTIONS);
    outgoing.manifest = {};
    outgoing.fallback = '<p>haz fallback</p>';

    const to = destinationBufferStream(result => {
        t.equal(result, '<p>haz fallback</p>');
        t.end();
    });

    outgoing.pipe(to);

    outgoing.pushFallback();
});

test('HttpOutgoing() - "options.throwable" is not defined - "this.throwable" should be "false"', t => {
    const outgoing = new HttpOutgoing(RESOURCE_OPTIONS, REQ_OPTIONS);
    t.notOk(outgoing.throwable);
    t.end();
});

test('HttpOutgoing() - "options.throwable" is defined to be true - "this.throwable" should be "true"', t => {
    const options = {
        uri: 'http://example.org',
        throwable: true,
    };
    const outgoing = new HttpOutgoing(options, REQ_OPTIONS);
    t.ok(outgoing.throwable);
    t.end();
});

test('HttpOutgoing() - "options.resolveCss" is not defined - "this.resolveCss" should be "false"', t => {
    const outgoing = new HttpOutgoing(RESOURCE_OPTIONS, REQ_OPTIONS);
    t.notOk(outgoing.resolveCss);
    t.end();
});

test('HttpOutgoing() - "options.resolveCss" is defined to be true - "this.resolveCss" should be "true"', t => {
    const options = {
        uri: 'http://example.org',
        resolveCss: true,
    };
    const outgoing = new HttpOutgoing(options, REQ_OPTIONS);
    t.ok(outgoing.resolveCss);
    t.end();
});

test('HttpOutgoing() - "options.resolveJs" is not defined - "this.resolveJs" should be "false"', t => {
    const outgoing = new HttpOutgoing(RESOURCE_OPTIONS, REQ_OPTIONS);
    t.notOk(outgoing.resolveJs);
    t.end();
});

test('HttpOutgoing() - "options.resolveJs" is defined to be true - "this.resolveJs" should be "true"', t => {
    const options = {
        uri: 'http://example.org',
        resolveJs: true,
    };
    const outgoing = new HttpOutgoing(options, REQ_OPTIONS);
    t.ok(outgoing.resolveJs);
    t.end();
});
