'use strict';

const utils = require('../lib/utils');
const test = require('ava');

/**
 * .uriBuilder()
 */

test('.uriBuilder() - "base" has long path with <filename>.json - should replace <filename>.json file with "input"', t => {
    const result = utils.uriBuilder(
        '/podlet.html',
        'http://localhost:7000/podlet/a/manifest.json'
    );
    t.true(result === 'http://localhost:7000/podlet/a/podlet.html');
});

test('.uriBuilder() - "base" has short path with <filename>.json - should replace <filename>.json file with "input"', t => {
    const result = utils.uriBuilder(
        '/podlet.html',
        'http://localhost:7000/manifest.json'
    );
    t.true(result === 'http://localhost:7000/podlet.html');
});

test('.uriBuilder() - "base" has long path without <filename>.json - should append "input" to "base"', t => {
    const result = utils.uriBuilder(
        '/podlet.html',
        'http://localhost:7000/podlet/a/'
    );
    t.true(result === 'http://localhost:7000/podlet/a/podlet.html');
});

test('.uriBuilder() - "base" has short path without <filename>.json - should append "input" to "base"', t => {
    const result = utils.uriBuilder('/podlet.html', 'http://localhost:7000/');
    t.true(result === 'http://localhost:7000/podlet.html');
});

test('.uriBuilder() - "input" does not begin with "/" - should replace <filename>.json file with "input"', t => {
    const result = utils.uriBuilder(
        'podlet.html',
        'http://localhost:7000/podlet/a/manifest.json'
    );
    t.true(result === 'http://localhost:7000/podlet/a/podlet.html');
});

test('.uriBuilder() - "base" is without <filename>.json and does not end with "/" - should append "input" to "base"', t => {
    const result = utils.uriBuilder('/podlet.html', 'http://localhost:7000');
    t.true(result === 'http://localhost:7000/podlet.html');
});

test('.uriBuilder() - "extra" is provided - should append "extra"', t => {
    const result = utils.uriBuilder('/podlet', 'http://localhost:7000/foo/', '/a/b');
    t.true(result === 'http://localhost:7000/foo/podlet/a/b');
});

/**
 * .uriIsRelative()
 */

test('.uriIsRelative() - "uri" is relative - should return "true"', t => {
    t.true(utils.uriIsRelative('/manifest.json'));
});

test('.uriIsRelative() - "uri" is absolute - should return "false"', t => {
    t.false(utils.uriIsRelative('http://localhost:7000/manifest.json'));
});
