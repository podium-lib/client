'use strict';

const isStream = require('is-stream');
const stream = require('stream');
const State = require('../lib/state');

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

test('State() - object tag - should be PodletClientState', () => {
    const state = new State(RESOURCE_OPTIONS);
    expect(Object.prototype.toString.call(state)).toEqual(
        '[object PodletClientState]'
    );
});

test('State() - "options.uri" not provided to constructor - should throw', () => {
    expect(() => {
        // eslint-disable-next-line no-unused-vars
        const state = new State();
    }).toThrowError(
        'you must pass a URI in "options.uri" to the State constructor'
    );
});

test('State() - set "uri" - should be persisted on "this.uri"', () => {
    const state = new State(RESOURCE_OPTIONS);
    expect(state.uri).toBe(RESOURCE_OPTIONS.uri);
});

test('State() - set "reqOptions" - should be persisted on "this.reqOptions"', () => {
    const state = new State(RESOURCE_OPTIONS, REQ_OPTIONS);
    expect(state.reqOptions.pathname).toBe('a');
    expect(state.reqOptions.query.b).toBe('c');
});

test('State() - "this.manifest" should be {_fallback: ""}', () => {
    const state = new State(RESOURCE_OPTIONS, REQ_OPTIONS);
    expect(state.manifest).toEqual({ _fallback: '' });
});

test('State() - "this.content" should be empty String', () => {
    const state = new State(RESOURCE_OPTIONS, REQ_OPTIONS);
    expect(state.content).toBe('');
});

test('State() - No value for streamThrough - "this.stream" should contain a PassThrough stream', () => {
    const state = new State(RESOURCE_OPTIONS, REQ_OPTIONS);
    // NOTE: PassThrough is just a transform stream pushing all chunks through. is-stream has no PassThrough check.
    expect(isStream.transform(state.stream)).toBe(true);
});

test('State() - "true" value for streamThrough - "this.stream" should contain a PassThrough stream', () => {
    const state = new State(RESOURCE_OPTIONS, REQ_OPTIONS, true);
    // NOTE: PassThrough is just a transform stream pushing all chunks through. is-stream has no PassThrough check.
    expect(isStream.transform(state.stream)).toBe(true);
});

test('State() - "false" value for streamThrough - "this.stream" should contain a Writable stream', () => {
    const state = new State(RESOURCE_OPTIONS, REQ_OPTIONS, false);
    expect(isStream.writable(state.stream)).toBe(true);
});

test('State() - this.stream errors - should emit error event', () => {
    expect.hasAssertions();

    const state = new State(RESOURCE_OPTIONS, REQ_OPTIONS, true);
    state.stream.on('error', error => {
        expect(error).toBe('error');
    });
    state.stream.emit('error', 'error');
});

test('State() - get manifestUri - should return URI to manifest', () => {
    const state = new State(RESOURCE_OPTIONS);
    expect(state.manifestUri).toBe(RESOURCE_OPTIONS.uri);
});

test('State() - fallbackStream - "this.fallbackStream()" should return a readable stream', () => {
    const state = new State(RESOURCE_OPTIONS, REQ_OPTIONS);
    expect(isStream.readable(state.fallbackStream())).toBe(true);
});

test('State() - fallbackStream - "this.fallbackStream()" should stream fallback content', () => {
    const state = new State(RESOURCE_OPTIONS, REQ_OPTIONS);
    state.manifest = {};
    state.fallback = '<p>haz fallback</p>';

    const buffer = [];
    const to = new stream.Writable({
        write: (chunk, enc, next) => {
            buffer.push(chunk);
            next();
        },
    });

    state
        .fallbackStream(() => {
            expect(buffer.join().toString()).toBe('<p>haz fallback</p>');
        })
        .pipe(to);
});

test('State() - "options.throwable" is not defined - "this.throwable" should be "false"', () => {
    const state = new State(RESOURCE_OPTIONS, REQ_OPTIONS);
    expect(state.throwable).toBeFalsy();
});

test('State() - "options.throwable" is defined to be true - "this.throwable" should be "true"', () => {
    const options = {
        uri: 'http://example.org',
        throwable: true,
    };
    const state = new State(options, REQ_OPTIONS);
    expect(state.throwable).toBeTruthy();
});

test('State() - "options.resolveCss" is not defined - "this.resolveCss" should be "false"', () => {
    const state = new State(RESOURCE_OPTIONS, REQ_OPTIONS);
    expect(state.resolveCss).toBeFalsy();
});

test('State() - "options.resolveCss" is defined to be true - "this.resolveCss" should be "true"', () => {
    const options = {
        uri: 'http://example.org',
        resolveCss: true,
    };
    const state = new State(options, REQ_OPTIONS);
    expect(state.resolveCss).toBeTruthy();
});

test('State() - "options.resolveJs" is not defined - "this.resolveJs" should be "false"', () => {
    const state = new State(RESOURCE_OPTIONS, REQ_OPTIONS);
    expect(state.resolveJs).toBeFalsy();
});

test('State() - "options.resolveJs" is defined to be true - "this.resolveJs" should be "true"', () => {
    const options = {
        uri: 'http://example.org',
        resolveJs: true,
    };
    const state = new State(options, REQ_OPTIONS);
    expect(state.resolveJs).toBeTruthy();
});
