import tap from 'tap';
import Resource from '../lib/resource.js';
import Client from '../lib/client.js';

/**
 * .register()
 */

tap.test(
    'client.register() - call with a valid value for "options.uri" - should return a "Resources" object',
    (t) => {
        const client = new Client({ name: 'podiumClient' });
        const resource = client.register({
            uri: 'http://example-a.org',
            name: 'example',
        });
        t.ok(resource instanceof Resource);
        t.end();
    },
);

tap.test('client.register() - call with no options - should throw', (t) => {
    const client = new Client({ name: 'podiumClient' });
    t.throws(() => {
        // @ts-expect-error Testing bad input
        client.register();
    }, 'The value, "undefined", for the required argument "name" on the .register() method is not defined or not valid.');
    t.end();
});

tap.test(
    'client.register() - call with missing value for "options.uri" - should throw',
    (t) => {
        const client = new Client({ name: 'podiumClient' });

        t.throws(() => {
            // @ts-expect-error Testing bad input
            client.register({ name: 'example' });
        }, 'The value, "undefined", for the required argument "uri" on the .register() method is not defined or not valid.');
        t.end();
    },
);

tap.test(
    'client.register() - call with a invalid value for "options.uri" - should throw',
    (t) => {
        const client = new Client({ name: 'podiumClient' });

        t.throws(() => {
            client.register({ uri: '/wrong', name: 'someName' });
        }, 'The value, "/wrong", for the required argument "uri" on the .register() method is not defined or not valid.');
        t.end();
    },
);

tap.test(
    'client.register() - call with a invalid value for "options.name" - should throw',
    (t) => {
        const client = new Client({ name: 'podiumClient' });

        t.throws(() => {
            client.register({ uri: 'http://example-a.org', name: 'some name' });
        }, 'The value, "some name", for the required argument "name" on the .register() method is not defined or not valid.');
        t.end();
    },
);

tap.test(
    'client.register() - call with missing value for "options.name" - should throw',
    (t) => {
        const client = new Client({ name: 'podiumClient' });

        t.throws(() => {
            // @ts-expect-error Testing bad input
            client.register({ uri: 'http://example-a.org' });
        }, 'The value, "undefined", for the required argument "name" on the .register() method is not defined or not valid.');
        t.end();
    },
);

tap.test('client.register() - call duplicate names - should throw', (t) => {
    const client = new Client({ name: 'podiumClient' });
    client.register({ uri: 'http://example-a.org', name: 'someName' });

    t.throws(() => {
        client.register({ uri: 'http://example-a.org', name: 'someName' });
    }, 'Resource with the name "someName" has already been registered.');
    t.end();
});

tap.test(
    'client.register() - register resources - should set resource as property of client object',
    (t) => {
        const client = new Client({ name: 'podiumClient' });
        const a = client.register({
            uri: 'http://example-a.org',
            name: 'exampleA',
        });
        const b = client.register({
            uri: 'http://example-b.org',
            name: 'exampleB',
        });

        // @ts-expect-error This is generated runtime
        t.ok(client.exampleA);
        // @ts-expect-error This is generated runtime
        t.ok(client.exampleB);
        // @ts-expect-error This is generated runtime
        t.equal(a, client.exampleA);
        // @ts-expect-error This is generated runtime
        t.equal(b, client.exampleB);
        t.end();
    },
);

tap.test(
    'client.register() - register resources - should be possible to iterate over resources set on client object',
    (t) => {
        const client = new Client({ name: 'podiumClient' });
        const a = client.register({
            uri: 'http://example-a.org',
            name: 'exampleA',
        });
        const b = client.register({
            uri: 'http://example-b.org',
            name: 'exampleB',
        });

        // @ts-expect-error The client implements the iterator symbol
        t.same([a, b], Array.from(client));
        t.end();
    },
);

tap.test(
    'client.register() - try to manually set register resource - should throw',
    (t) => {
        const client = new Client({ name: 'podiumClient' });
        client.register({
            uri: 'http://example-a.org',
            name: 'exampleA',
        });

        t.throws(() => {
            // @ts-expect-error This is generated runtime
            client.exampleA = 'foo';
        }, 'Cannot set read-only property.');
        t.end();
    },
);

tap.test(
    'client.register() - call with both includeBy and excludeBy deviceType - should throw',
    (t) => {
        const client = new Client({ name: 'podiumClient' });

        t.throws(() => {
            client.register({
                uri: 'http://example-a.org',
                name: 'exampleA',
                includeBy: { deviceType: ['hybrid-ios'] },
                excludeBy: { deviceType: ['hybrid-android'] },
            });
        }, 'A podlet can only be registered with either includeBy or excludeBy, not both.');
        t.end();
    },
);
