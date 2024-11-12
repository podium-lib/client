import tap from 'tap';
import { PodletServer } from '@podium/test-utils';
import { HttpIncoming } from '@podium/utils';
import HttpOutgoing from '../lib/http-outgoing.js';
import Fallback from '../lib/resolver.fallback.js';

// Fake headers
const headers = {};

tap.test(
    'resolver.fallback() - object tag - should be PodletClientFallbackResolver',
    (t) => {
        const fallback = new Fallback();
        t.equal(
            Object.prototype.toString.call(fallback),
            '[object PodletClientFallbackResolver]',
        );
        t.end();
    },
);

tap.test(
    'resolver.fallback() - fallback field is empty - should set value on "outgoing.fallback" to empty String',
    async (t) => {
        const server = new PodletServer();
        // @ts-ignore
        const manifest = server.manifest;
        manifest.fallback = '';

        const outgoing = new HttpOutgoing(
            {
                uri: 'http://example.com',
                name: 'test',
                maxAge: Infinity,
                timeout: 1000,
            },
            {},
            new HttpIncoming({ headers }),
        );
        outgoing.manifest = manifest;

        const fallback = new Fallback();
        const result = await fallback.resolve(outgoing);
        t.equal(result.fallback, '');
        t.end();
    },
);

tap.test(
    'resolver.fallback() - fallback field contains invalid value - should set value on "outgoing.fallback" to empty String',
    async (t) => {
        const server = new PodletServer();
        // @ts-ignore
        const manifest = server.manifest;
        manifest.fallback = 'ht++ps://blæ.finn.no/fallback.html';

        const outgoing = new HttpOutgoing(
            {
                uri: 'http://example.com',
                name: 'test',
                maxAge: Infinity,
                timeout: 1000,
            },
            {},
            new HttpIncoming({ headers }),
        );
        outgoing.manifest = manifest;

        const fallback = new Fallback();
        const result = await fallback.resolve(outgoing);
        t.equal(result.fallback, '');
        t.end();
    },
);

tap.test(
    'resolver.fallback() - fallback field is a URI - should fetch fallback and set content on "outgoing.fallback"',
    async (t) => {
        const server = new PodletServer();
        const service = await server.listen();

        // @ts-ignore
        const manifest = server.manifest;
        manifest.fallback = `${service.address}/fallback.html`;

        const outgoing = new HttpOutgoing(
            {
                uri: service.options.uri,
                name: 'test',
                maxAge: Infinity,
                timeout: 1000,
            },
            {},
            new HttpIncoming({ headers }),
        );
        outgoing.manifest = manifest;

        const fallback = new Fallback();
        const result = await fallback.resolve(outgoing);
        // @ts-ignore
        t.same(result.fallback, server.fallbackBody);

        await server.close();
        t.end();
    },
);

tap.test(
    'resolver.fallback() - fallback field is a URI - should fetch fallback and set content on "outgoing.manifest._fallback"',
    async (t) => {
        const server = new PodletServer();
        const service = await server.listen();

        // @ts-ignore
        const manifest = server.manifest;
        manifest.fallback = `${service.address}/fallback.html`;

        const outgoing = new HttpOutgoing(
            {
                uri: service.options.uri,
                name: 'test',
                maxAge: Infinity,
                timeout: 1000,
            },
            {},
            new HttpIncoming({ headers }),
        );
        outgoing.manifest = manifest;

        const fallback = new Fallback();
        const result = await fallback.resolve(outgoing);
        // @ts-expect-error Internal property
        t.same(result.manifest._fallback, server.fallbackBody);

        await server.close();
        t.end();
    },
);

tap.test(
    'resolver.fallback() - remote can not be resolved - "outgoing.manifest" should be empty string',
    async (t) => {
        const outgoing = new HttpOutgoing(
            {
                uri: 'http://does.not.exist.finn.no/manifest.json',
                throwable: false,
                name: 'test',
                maxAge: Infinity,
                timeout: 1000,
            },
            {},
            new HttpIncoming({ headers }),
        );

        // @ts-expect-error Good enough for the test
        outgoing.manifest = {
            fallback: 'http://does.not.exist.finn.no/fallback.html',
        };

        const fallback = new Fallback();
        await fallback.resolve(outgoing);
        t.equal(outgoing.fallback, '');
        t.end();
    },
);

tap.test(
    'resolver.fallback() - remote responds with http 500 - "outgoing.manifest" should be empty string',
    async (t) => {
        const server = new PodletServer();
        const service = await server.listen();

        const outgoing = new HttpOutgoing(
            {
                uri: service.options.uri,
                throwable: false,
                name: 'test',
                maxAge: Infinity,
                timeout: 1000,
            },
            {},
            new HttpIncoming({ headers }),
        );

        // @ts-expect-error Good enough for the test
        outgoing.manifest = {
            fallback: service.error,
        };

        const fallback = new Fallback();
        await fallback.resolve(outgoing);
        t.equal(outgoing.fallback, '');

        await server.close();
        t.end();
    },
);

tap.test(
    'resolver.fallback() - should handle unreachable podlet',
    async (t) => {
        const server = new PodletServer({
            name: 'aa',
        });
        const podlet = await server.listen();

        const up = new HttpOutgoing(
            {
                uri: podlet.manifest,
                name: 'up',
                timeout: 1000,
                maxAge: Infinity,
            },
            {},
            new HttpIncoming({ headers }),
        );
        const down = new HttpOutgoing(
            {
                uri: 'https://localhost:8128/manifest.json',
                name: 'down',
                timeout: 1000,
                maxAge: Infinity,
            },
            {},
            new HttpIncoming({ headers }),
        );

        try {
            await Promise.all([
                new Fallback().resolve(up),
                new Fallback().resolve(down),
            ]);
        } catch (e) {
            t.fail(e);
        }

        await server.close();
        t.pass();
    },
);
