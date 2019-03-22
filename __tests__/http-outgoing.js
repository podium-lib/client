'use strict';

const isStream = require('is-stream');
const stream = require('readable-stream');
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

test('HttpOutgoing() - object tag - should be PodletClientHttpOutgoing', () => {
    const outgoing = new HttpOutgoing(RESOURCE_OPTIONS);
    expect(Object.prototype.toString.call(outgoing)).toEqual(
        '[object PodletClientHttpOutgoing]'
    );
});

test('HttpOutgoing() - "options.uri" not provided to constructor - should throw', () => {
    expect(() => {
        // eslint-disable-next-line no-unused-vars
        const outgoing = new HttpOutgoing();
    }).toThrowError(
        'you must pass a URI in "options.uri" to the HttpOutgoing constructor'
    );
});

test('HttpOutgoing() - set "uri" - should be accessable on "this.manifestUri"', () => {
    const outgoing = new HttpOutgoing(RESOURCE_OPTIONS);
    expect(outgoing.manifestUri).toBe(RESOURCE_OPTIONS.uri);
});

test('HttpOutgoing() - set "reqOptions" - should be persisted on "this.reqOptions"', () => {
    const outgoing = new HttpOutgoing(RESOURCE_OPTIONS, REQ_OPTIONS);
    expect(outgoing.reqOptions.pathname).toBe('a');
    expect(outgoing.reqOptions.query.b).toBe('c');
});

test('HttpOutgoing() - "this.manifest" should be {_fallback: ""}', () => {
    const outgoing = new HttpOutgoing(RESOURCE_OPTIONS, REQ_OPTIONS);
    expect(outgoing.manifest).toEqual({ _fallback: '' });
});

test('HttpOutgoing() - "this.content" should be empty String', () => {
    const outgoing = new HttpOutgoing(RESOURCE_OPTIONS, REQ_OPTIONS);
    expect(outgoing.content).toBe('');
});

test('HttpOutgoing() - No value for streamThrough - "this.stream" should contain a PassThrough stream', () => {
    const outgoing = new HttpOutgoing(RESOURCE_OPTIONS, REQ_OPTIONS);
    // NOTE: PassThrough is just a transform stream pushing all chunks through. is-stream has no PassThrough check.
    expect(isStream.transform(outgoing.stream)).toBe(true);
});

test('HttpOutgoing() - "true" value for streamThrough - "this.stream" should contain a PassThrough stream', () => {
    const outgoing = new HttpOutgoing(RESOURCE_OPTIONS, REQ_OPTIONS, true);
    // NOTE: PassThrough is just a transform stream pushing all chunks through. is-stream has no PassThrough check.
    expect(isStream.transform(outgoing.stream)).toBe(true);
});

test('HttpOutgoing() - "false" value for streamThrough - "this.stream" should contain a Writable stream', () => {
    const outgoing = new HttpOutgoing(RESOURCE_OPTIONS, REQ_OPTIONS, false);
    expect(isStream.writable(outgoing.stream)).toBe(true);
});

test('HttpOutgoing() - this.stream errors - should emit error event', () => {
    expect.hasAssertions();

    const outgoing = new HttpOutgoing(RESOURCE_OPTIONS, REQ_OPTIONS, true);
    outgoing.stream.on('error', error => {
        expect(error).toBe('error');
    });
    outgoing.stream.emit('error', 'error');
});

test('HttpOutgoing() - get manifestUri - should return URI to manifest', () => {
    const outgoing = new HttpOutgoing(RESOURCE_OPTIONS);
    expect(outgoing.manifestUri).toBe(RESOURCE_OPTIONS.uri);
});

test('HttpOutgoing() - fallbackStream - "this.fallbackStream()" should return a readable stream', () => {
    const outgoing = new HttpOutgoing(RESOURCE_OPTIONS, REQ_OPTIONS);
    expect(isStream.readable(outgoing.fallbackStream())).toBe(true);
});

test('HttpOutgoing() - fallbackStream - "this.fallbackStream()" should stream fallback content', () => {
    const outgoing = new HttpOutgoing(RESOURCE_OPTIONS, REQ_OPTIONS);
    outgoing.manifest = {};
    outgoing.fallback = '<p>haz fallback</p>';

    const buffer = [];
    const to = new stream.Writable({
        write: (chunk, enc, next) => {
            buffer.push(chunk);
            next();
        },
    });

    outgoing
        .fallbackStream(() => {
            expect(buffer.join().toString()).toBe('<p>haz fallback</p>');
        })
        .pipe(to);
});

test('HttpOutgoing() - "options.throwable" is not defined - "this.throwable" should be "false"', () => {
    const outgoing = new HttpOutgoing(RESOURCE_OPTIONS, REQ_OPTIONS);
    expect(outgoing.throwable).toBeFalsy();
});

test('HttpOutgoing() - "options.throwable" is defined to be true - "this.throwable" should be "true"', () => {
    const options = {
        uri: 'http://example.org',
        throwable: true,
    };
    const outgoing = new HttpOutgoing(options, REQ_OPTIONS);
    expect(outgoing.throwable).toBeTruthy();
});

test('HttpOutgoing() - "options.resolveCss" is not defined - "this.resolveCss" should be "false"', () => {
    const outgoing = new HttpOutgoing(RESOURCE_OPTIONS, REQ_OPTIONS);
    expect(outgoing.resolveCss).toBeFalsy();
});

test('HttpOutgoing() - "options.resolveCss" is defined to be true - "this.resolveCss" should be "true"', () => {
    const options = {
        uri: 'http://example.org',
        resolveCss: true,
    };
    const outgoing = new HttpOutgoing(options, REQ_OPTIONS);
    expect(outgoing.resolveCss).toBeTruthy();
});

test('HttpOutgoing() - "options.resolveJs" is not defined - "this.resolveJs" should be "false"', () => {
    const outgoing = new HttpOutgoing(RESOURCE_OPTIONS, REQ_OPTIONS);
    expect(outgoing.resolveJs).toBeFalsy();
});

test('HttpOutgoing() - "options.resolveJs" is defined to be true - "this.resolveJs" should be "true"', () => {
    const options = {
        uri: 'http://example.org',
        resolveJs: true,
    };
    const outgoing = new HttpOutgoing(options, REQ_OPTIONS);
    expect(outgoing.resolveJs).toBeTruthy();
});
