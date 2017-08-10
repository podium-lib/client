'use strict';

const Resource = require('../lib/resource');
const Client = require('../');
const test = require('ava');



/**
 * Constructor
 */

test('Client() - instantiate new client object - should have register method', t => {
    const client = new Client();
    t.true(typeof client.register === 'function');
});



/**
 * .register()
 */

test('client.register() - call with a valid value for "options.uri" - should return a "Resources" object', t => {
    const client = new Client();
    const resource = client.register({uri: 'http://example-a.org'});
    t.true(resource instanceof Resource);
});

test('client.register() - call with missing value for "options.uri" - should throw', t => {
    const client = new Client();
    const error = t.throws(() => {
        client.register({});
    }, Error);

    t.is(error.message, '"options.uri" must be defined');
});

test('client.register() - call with a invalid value for "options.uri" - should throw', t => {
    const client = new Client();
    const error = t.throws(() => {
        client.register({uri: '/wrong'});
    }, Error);

    t.is(error.message, 'The value for "options.uri", /wrong, is not a valid URI');
});
