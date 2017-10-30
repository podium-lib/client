'use strict';

const isStream = require('is-stream');
const stream = require('stream');
const Cache = require('ttl-mem-cache');
const State = require('../lib/state');

const REGISTRY = new Cache();
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

test('State() - "registry" not provided to constructor - should throw', () => {
    expect(() => {
        // eslint-disable-next-line no-unused-vars
        const state = new State();
    }).toThrowError(
        'you must pass a "registry" object to the State constructor'
    );
});

test('State() - "options.uri" not provided to constructor - should throw', () => {
    expect(() => {
        // eslint-disable-next-line no-unused-vars
        const state = new State(REGISTRY);
    }).toThrowError(
        'you must pass a URI in "options.uri" to the State constructor'
    );
});

test('State() - set "registry" - should be persisted on "this.registry"', () => {
    const state = new State(REGISTRY, RESOURCE_OPTIONS);
    expect(state.registry).not.toBeUndefined();
});

test('State() - set "uri" - should be persisted on "this.uri"', () => {
    const state = new State(REGISTRY, RESOURCE_OPTIONS);
    expect(state.uri).toBe(RESOURCE_OPTIONS.uri);
});

test('State() - set "reqOptions" - should be persisted on "this.reqOptions"', () => {
    const state = new State(REGISTRY, RESOURCE_OPTIONS, REQ_OPTIONS);
    expect(state.reqOptions.pathname).toBe('a');
    expect(state.reqOptions.query.b).toBe('c');
});

test('State() - "this.manifest" should be undefined', () => {
    const state = new State(REGISTRY, RESOURCE_OPTIONS, REQ_OPTIONS);
    expect(state.manifest).toBeUndefined();
});

test('State() - "this.content" should be empty String', () => {
    const state = new State(REGISTRY, RESOURCE_OPTIONS, REQ_OPTIONS);
    expect(state.content).toBe('');
});

test('State() - No value for streamThrough - "this.stream" should contain a PassThrough stream', () => {
    const state = new State(REGISTRY, RESOURCE_OPTIONS, REQ_OPTIONS);
    // NOTE: PassThrough is just a transform stream pushing all chunks through. is-stream has no PassThrough check.
    expect(isStream.transform(state.stream)).toBe(true);
});

test('State() - "true" value for streamThrough - "this.stream" should contain a PassThrough stream', () => {
    const state = new State(REGISTRY, RESOURCE_OPTIONS, REQ_OPTIONS, true);
    // NOTE: PassThrough is just a transform stream pushing all chunks through. is-stream has no PassThrough check.
    expect(isStream.transform(state.stream)).toBe(true);
});

test('State() - "false" value for streamThrough - "this.stream" should contain a Writable stream', () => {
    const state = new State(REGISTRY, RESOURCE_OPTIONS, REQ_OPTIONS, false);
    expect(isStream.writable(state.stream)).toBe(true);
});

test('State() - get manifestUri - should return absolute URI to manifest', () => {
    const state = new State(REGISTRY, RESOURCE_OPTIONS);
    expect(state.manifestUri).toBe(RESOURCE_OPTIONS.uri);
});

test('State() - get fallbackUri when "fallback" in manifest is absolute - should return absolute URI to fallback', () => {
    const state = new State(REGISTRY, RESOURCE_OPTIONS);
    state.manifest = { fallback: 'http://foo.example.com/fallback.html' };
    expect(state.fallbackUri).toBe('http://foo.example.com/fallback.html');
});

test('State() - get fallbackUri when "fallback" in manifest is relative - should return absolute URI to fallback', () => {
    const state = new State(REGISTRY, RESOURCE_OPTIONS);
    state.manifest = { fallback: '/fallback.html' };
    expect(state.fallbackUri).toBe(`${RESOURCE_OPTIONS.uri}/fallback.html`);
});

test('State() - get contentUri when "content" in manifest is absolute - should return absolute URI to content', () => {
    const state = new State(REGISTRY, RESOURCE_OPTIONS);
    state.manifest = { content: 'http://foo.example.com/index.html' };
    expect(state.contentUri).toBe('http://foo.example.com/index.html');
});

test('State() - get fallbackUri when "content" in manifest is relative - should return absolute URI to content', () => {
    const state = new State(REGISTRY, RESOURCE_OPTIONS);
    state.manifest = { content: '/index.html' };
    expect(state.contentUri).toBe(`${RESOURCE_OPTIONS.uri}/index.html`);
});

test('State() - fallbackStream - "this.fallbackStream()" should return a readable stream', () => {
    const state = new State(REGISTRY, RESOURCE_OPTIONS, REQ_OPTIONS);
    expect(isStream.readable(state.fallbackStream())).toBe(true);
});

test('State() - fallbackStream - "this.fallbackStream()" should stream fallback content', () => {
    const state = new State(REGISTRY, RESOURCE_OPTIONS, REQ_OPTIONS);
    state.fallback = '<p>haz fllback</p>';

    const buffer = [];
    const to = new stream.Writable({
        write: (chunk, enc, next) => {
            buffer.push(chunk);
            next();
        },
    });

    state.fallbackStream(() => {
        expect(buffer.join().toString()).toBe('<p>haz fllback</p>');
    }).pipe(to);
});

test('State() - "options.throwable" is not defined - "this.throwable" should be "false"', () => {
    const state = new State(REGISTRY, RESOURCE_OPTIONS, REQ_OPTIONS);
    expect(state.throwable).toBeFalsy();
});

test('State() - "options.throwable" is defined to be true - "this.throwable" should be "true"', () => {
    const options = {
        uri: 'http://example.org',
        throwable: true,
    };
    const state = new State(REGISTRY, options, REQ_OPTIONS);
    expect(state.throwable).toBeTruthy();
});
