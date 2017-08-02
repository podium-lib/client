'use strict';

const isStream = require('is-stream');
const stream = require('readable-stream');
const State = require('../lib/state');
const test = require('ava');
const LRU = require('lru-cache');

const REGISTRY = LRU({
    max: 20
});
const REQ_OPTIONS = {
    pathname: 'a',
    query: {b:'c'}
};
const URI = 'http://example.org';

test('state - new State() - set "registry" - should be persisted on "this.registry"', t => {
    const state = new State(REGISTRY);
    t.is(state.registry.max, 20);
});

test('state - new State() - set "uri" - should be persisted on "this.uri"', t => {
    const state = new State(REGISTRY, URI);
    t.is(state.uri, URI);
});

test('state - new State() - set "reqOptions" - should be persisted on "this.reqOptions"', t => {
    const state = new State(REGISTRY, URI, REQ_OPTIONS);
    t.is(state.reqOptions.pathname, 'a');
    t.is(state.reqOptions.query.b, 'c');
});

test('state - new State() - "this.manifest" should be undefined', t => {
    const state = new State(REGISTRY, URI, REQ_OPTIONS);
    t.true(typeof state.manifest === 'undefined');
});

test('state - new State() - "this.content" should be undefined', t => {
    const state = new State(REGISTRY, URI, REQ_OPTIONS);
    t.true(typeof state.content === 'undefined');
});

test('state - new State() - No value for streamThrough - "this.stream" should contain a PassThrough stream', t => {
    const state = new State(REGISTRY, URI, REQ_OPTIONS);
    // NOTE: PassThrough is just a transform stream pushing all chunks through. is-stream has no PassThrough check.
    t.true(isStream.transform(state.stream));
});

test('state - new State() - "true" value for streamThrough - "this.stream" should contain a PassThrough stream', t => {
    const state = new State(REGISTRY, URI, REQ_OPTIONS, true);
    // NOTE: PassThrough is just a transform stream pushing all chunks through. is-stream has no PassThrough check.
    t.true(isStream.transform(state.stream));
});


test('state - new State() - "false" value for streamThrough - "this.stream" should contain a Writable stream', t => {
    const state = new State(REGISTRY, URI, REQ_OPTIONS, false);
    t.true(isStream.writable(state.stream));
});
