import tap from 'tap';
import { destinationBufferStream } from '@podium/test-utils';
import { PassThrough } from 'stream';
import HttpOutgoing from '../lib/http-outgoing.js';

const REQ_OPTIONS = {
    pathname: 'a',
    query: { b: 'c' },
};
const RESOURCE_OPTIONS = {
    name: 'test',
    timeout: 1000,
    uri: 'http://example.org',
    maxAge: Infinity,
};

/**
 * Constructor
 */

tap.test(
    'HttpOutgoing() - object tag - should be PodletClientHttpOutgoing',
    (t) => {
        const outgoing = new HttpOutgoing(RESOURCE_OPTIONS);
        t.equal(
            Object.prototype.toString.call(outgoing),
            '[object PodletClientHttpOutgoing]',
        );
        t.end();
    },
);

tap.test(
    'HttpOutgoing() - "options.uri" not provided to constructor - should throw',
    (t) => {
        t.throws(() => {
            // eslint-disable-next-line no-unused-vars
            const outgoing = new HttpOutgoing();
        }, 'you must pass a URI in "options.uri" to the HttpOutgoing constructor');
        t.end();
    },
);

tap.test('HttpOutgoing() - should be a PassThrough stream', (t) => {
    const outgoing = new HttpOutgoing(RESOURCE_OPTIONS, REQ_OPTIONS);
    t.ok(outgoing instanceof PassThrough);
    t.end();
});

tap.test(
    'HttpOutgoing() - set "uri" - should be accessable on "this.manifestUri"',
    (t) => {
        const outgoing = new HttpOutgoing(RESOURCE_OPTIONS);
        t.equal(outgoing.manifestUri, RESOURCE_OPTIONS.uri);
        t.end();
    },
);

tap.test(
    'HttpOutgoing() - set "reqOptions" - should be persisted on "this.reqOptions"',
    (t) => {
        const outgoing = new HttpOutgoing(RESOURCE_OPTIONS, REQ_OPTIONS);
        t.equal(outgoing.reqOptions.pathname, 'a');
        t.equal(outgoing.reqOptions.query.b, 'c');
        t.end();
    },
);

tap.test('HttpOutgoing() - "this.manifest" should be {_fallback: ""}', (t) => {
    const outgoing = new HttpOutgoing(RESOURCE_OPTIONS, REQ_OPTIONS);
    t.same(outgoing.manifest, { _fallback: '', _js: [], _css: [] });
    t.end();
});

tap.test(
    'HttpOutgoing() - get manifestUri - should return URI to manifest',
    (t) => {
        const outgoing = new HttpOutgoing(RESOURCE_OPTIONS);
        t.equal(outgoing.manifestUri, RESOURCE_OPTIONS.uri);
        t.end();
    },
);

tap.test(
    'HttpOutgoing() - call .pushFallback() - should push the fallback content on the stream',
    (t) => {
        t.plan(1);
        const outgoing = new HttpOutgoing(RESOURCE_OPTIONS, REQ_OPTIONS);
        // @ts-expect-error Good enough for the test
        outgoing.manifest = {};
        outgoing.fallback = '<p>haz fallback</p>';

        const to = destinationBufferStream((result) => {
            t.equal(result, '<p>haz fallback</p>');
            t.end();
        });

        outgoing.pipe(to);

        outgoing.pushFallback();
    },
);

tap.test(
    'HttpOutgoing() - "options.throwable" is not defined - "this.throwable" should be "false"',
    (t) => {
        const outgoing = new HttpOutgoing(RESOURCE_OPTIONS, REQ_OPTIONS);
        t.notOk(outgoing.throwable);
        t.end();
    },
);

tap.test(
    'HttpOutgoing() - "options.throwable" is defined to be true - "this.throwable" should be "true"',
    (t) => {
        const options = {
            ...RESOURCE_OPTIONS,
            uri: 'http://example.org',
            throwable: true,
        };
        const outgoing = new HttpOutgoing(options, REQ_OPTIONS);
        t.ok(outgoing.throwable);
        t.end();
    },
);
