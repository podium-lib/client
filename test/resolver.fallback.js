'use strict';

const fallback = require('../lib/resolver.fallback.js');
const State = require('../lib/state.js');
const nock = require('nock');
const test = require('ava');
const path = require('path');
const fs = require('fs');

const MANIFEST_HAS_HTML_AND_SRC = fs.readFileSync(path.resolve(__dirname, 'fixtures/manifest.fallback.has.both.html.and.src.json'), {encoding: 'utf8'});
const MANIFEST_NO_FALLBACK = fs.readFileSync(path.resolve(__dirname, 'fixtures/manifest.fallback.not.defined.json'), {encoding: 'utf8'});
const MANIFEST_HAS_HTML = fs.readFileSync(path.resolve(__dirname, 'fixtures/manifest.fallback.has.html.json'), {encoding: 'utf8'});
const MANIFEST_HAS_SRC = fs.readFileSync(path.resolve(__dirname, 'fixtures/manifest.fallback.has.src.json'), {encoding: 'utf8'});

test('resolver.fallback() - no fallback field in manifest - should return empty String', async t => {
    const state = new State();
    state.manifest = JSON.parse(MANIFEST_NO_FALLBACK);
    const result = await fallback(state);
    t.is(result.fallback, '');
});

test('resolver.fallback() - fallback has "html" field in manifest - should set value on "state.fallback"', async t => {
    const state = new State();
    state.manifest = JSON.parse(MANIFEST_HAS_HTML);
    const result = await fallback(state);
    t.is(result.fallback, '<p>haz fallback</p>');
});

test('resolver.fallback() - fallback has "src" field in manifest - should fetch src and set content on "state.fallback"', async t => {
    nock('http://example-a.org')
        .get('/fallback.html')
        .reply(200, '<p>served fallback</p>');

    const state = new State({}, {uri: 'http://example-a.org/manifest.json'});
    state.manifest = JSON.parse(MANIFEST_HAS_SRC);
    const result = await fallback(state);
    t.is(result.fallback, '<p>served fallback</p>');
});

test('resolver.fallback() - fallback has "src" field in manifest - should fetch src and set content on "state.manifest.fallback.html"', async t => {
    nock('http://example-a.org')
        .get('/fallback.html')
        .reply(200, '<p>served fallback</p>');

    const state = new State({}, {uri: 'http://example-a.org/manifest.json'});
    state.manifest = JSON.parse(MANIFEST_HAS_SRC);
    const result = await fallback(state);
    t.is(result.manifest.fallback.html, '<p>served fallback</p>');
});

test('resolver.fallback() - fallback has both "html" and "src" field in manifest - should set value for "html" on "state.fallback"', async t => {
    const state = new State();
    state.manifest = JSON.parse(MANIFEST_HAS_HTML_AND_SRC);
    const result = await fallback(state);
    t.is(result.fallback, '<p>haz all the fallbacks</p>');
});

test('resolver.fallback() - server responds with error when fetching fallback - should throw', async t => {
    nock('http://example-a.org')
        .get('/fallback.html')
        .reply(500, 'Internal server error');

    const state = new State({}, {uri: 'http://example-a.org/manifest.json'});
    state.manifest = JSON.parse(MANIFEST_HAS_SRC);

	const error = await t.throws(fallback(state));
	t.is(error.message, 'Fallback responded with http status 500');
});
