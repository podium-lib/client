import tap from 'tap';
import { HttpIncoming } from '@podium/utils';
import * as utils from '@podium/utils';
import {
    destinationBufferStream,
    PodletServer,
    HttpServer,
} from '@podium/test-utils';
import HttpOutgoing from '../lib/http-outgoing.js';
import Content from '../lib/resolver.content.js';

// Fake headers
const headers = {};

/**
 * TODO II:
 * Resolving URI's should happen in outgoing object and not in manifest resolver.
 */

tap.test(
    'resolver.content() - object tag - should be PodletClientContentResolver',
    (t) => {
        const content = new Content();
        t.equal(
            Object.prototype.toString.call(content),
            '[object PodletClientContentResolver]',
        );
        t.end();
    },
);

tap.test(
    'resolver.content() - "podlet-version" header is same as manifest.version - should keep manifest on outgoing.manifest',
    async (t) => {
        const server = new PodletServer();
        const service = await server.listen();
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

        // See TODO II
        // @ts-ignore
        const { manifest } = server;
        manifest.content = utils.uriRelativeToAbsolute(
            // @ts-ignore
            server.manifest.content,
            outgoing.manifestUri,
        );

        outgoing.manifest = manifest;
        outgoing.status = 'cached';

        const content = new Content();
        await content.resolve(outgoing);

        t.ok(outgoing.manifest);
        await server.close();
        t.end();
    },
);

tap.test(
    'resolver.content() - "podlet-version" header is empty - should keep manifest on outgoing.manifest',
    async (t) => {
        const server = new PodletServer();
        const service = await server.listen();
        // @ts-ignore
        server.headersContent = {
            'podlet-version': '',
        };

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

        // See TODO II
        // @ts-ignore
        const { manifest } = server;
        manifest.content = utils.uriRelativeToAbsolute(
            // @ts-ignore
            server.manifest.content,
            outgoing.manifestUri,
        );

        outgoing.manifest = manifest;
        outgoing.status = 'cached';

        const content = new Content();
        await content.resolve(outgoing);

        t.ok(outgoing.manifest);
        await server.close();
        t.end();
    },
);

tap.test(
    'resolver.content() - "podlet-version" header is different than manifest.version - should set outgoing.status to "stale" and keep manifest',
    async (t) => {
        const server = new PodletServer();
        const service = await server.listen();
        // @ts-ignore
        server.headersContent = {
            'podlet-version': '2.0.0',
        };

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

        // See TODO II
        // @ts-ignore
        const { manifest } = server;
        manifest.content = utils.uriRelativeToAbsolute(
            // @ts-ignore
            server.manifest.content,
            outgoing.manifestUri,
        );

        outgoing.manifest = manifest;
        outgoing.status = 'cached';

        const content = new Content();
        await content.resolve(outgoing);

        // @ts-ignore
        t.equal(outgoing.manifest.version, server.manifest.version);
        t.equal(outgoing.status, 'stale');
        await server.close();
        t.end();
    },
);

tap.test(
    'resolver.content() - throwable:true - remote can not be resolved - should throw',
    async (t) => {
        const outgoing = new HttpOutgoing(
            {
                uri: 'http://does.not.exist.finn.no/manifest.json',
                throwable: true,
                name: 'test',
                maxAge: Infinity,
                timeout: 1000,
            },
            {},
            new HttpIncoming({ headers }),
        );

        // @ts-expect-error Good enough for the test
        outgoing.manifest = {
            content: 'http://does.not.exist.finn.no/index.html',
        };
        outgoing.status = 'cached';

        const content = new Content();

        try {
            await content.resolve(outgoing);
        } catch (error) {
            t.match(error.message, /Error reading content/);
            t.notOk(outgoing.success);
        }
        t.end();
    },
);

tap.test(
    'resolver.content() - throwable:true - remote responds with http 500 - should throw',
    async (t) => {
        const server = new PodletServer();
        const service = await server.listen();

        const outgoing = new HttpOutgoing(
            {
                uri: service.options.uri,
                throwable: true,
                name: 'test',
                maxAge: Infinity,
                timeout: 1000,
            },
            {},
            new HttpIncoming({ headers }),
        );

        // @ts-expect-error Good enough for the test
        outgoing.manifest = {
            content: service.error,
        };
        outgoing.status = 'cached';

        const content = new Content();

        try {
            await content.resolve(outgoing);
        } catch (error) {
            t.equal(error.statusCode, 500);
            t.equal(error.output.statusCode, 500); // backwards compat
            t.match(error.message, /Could not read content/);
            t.notOk(outgoing.success);
        }

        await server.close();
        t.end();
    },
);

tap.test(
    'resolver.content() - throwable:true - remote responds with http 404 - should throw with error object reflecting status code podlet responded with',
    async (t) => {
        const server = new PodletServer();
        const service = await server.listen();

        const outgoing = new HttpOutgoing(
            {
                uri: service.options.uri,
                throwable: true,
                name: 'test',
                maxAge: Infinity,
                timeout: 1000,
            },
            {},
            new HttpIncoming({ headers }),
        );

        // @ts-expect-error Good enough for the test
        outgoing.manifest = {
            content: `${service.address}/404`,
        };
        outgoing.status = 'cached';

        const content = new Content();

        try {
            await content.resolve(outgoing);
        } catch (error) {
            t.equal(error.statusCode, 404);
            t.equal(error.output.statusCode, 404); // backwards compat
            t.match(error.message, /Could not read content/);
            t.notOk(outgoing.success);
        }

        await server.close();
        t.end();
    },
);

tap.test(
    'resolver.content() - throwable:false - remote can not be resolved - "outgoing" should stream empty string',
    (t) => {
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
            content: 'http://does.not.exist.finn.no/index.html',
        };
        outgoing.status = 'cached';

        const to = destinationBufferStream((result) => {
            t.equal(result, '');
            t.ok(outgoing.success);
            t.end();
        });

        outgoing.pipe(to);

        const content = new Content();
        content.resolve(outgoing);
    },
);

tap.test(
    'resolver.content() - throwable:false with fallback set - remote can not be resolved - "outgoing" should stream fallback',
    (t) => {
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
            content: 'http://does.not.exist.finn.no/index.html',
        };
        outgoing.status = 'cached';
        outgoing.fallback = '<p>haz fallback</p>';

        const to = destinationBufferStream((result) => {
            t.equal(result, '<p>haz fallback</p>');
            t.ok(outgoing.success);
            t.end();
        });

        outgoing.pipe(to);

        const content = new Content();
        content.resolve(outgoing);
    },
);

tap.test(
    'resolver.content() - throwable:false - remote responds with http 500 - "outgoing" should stream empty string',
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
            content: service.error,
        };
        outgoing.status = 'cached';

        const to = destinationBufferStream((result) => {
            t.equal(result, '');
            t.ok(outgoing.success);
        });

        outgoing.pipe(to);

        const content = new Content();
        await content.resolve(outgoing);

        await server.close();
        t.end();
    },
);

tap.test(
    'resolver.content() - throwable:false with fallback set - remote responds with http 500 - "outgoing" should stream fallback',
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
            content: service.error,
        };
        outgoing.status = 'cached';
        outgoing.fallback = '<p>haz fallback</p>';

        const to = destinationBufferStream((result) => {
            t.equal(result, '<p>haz fallback</p>');
            t.ok(outgoing.success);
        });

        outgoing.pipe(to);

        const content = new Content();
        await content.resolve(outgoing);

        await server.close();
        t.end();
    },
);

tap.test(
    'resolver.content() - kill switch - throwable:true - recursions equals threshold - should throw',
    async (t) => {
        const outgoing = new HttpOutgoing(
            {
                uri: 'http://does.not.exist.finn.no/manifest.json',
                throwable: true,
                name: 'test',
                maxAge: Infinity,
                timeout: 1000,
            },
            {},
            new HttpIncoming({ headers }),
        );

        // @ts-expect-error Good enough for the test
        outgoing.manifest = {
            content: 'http://does.not.exist.finn.no/index.html',
        };
        outgoing.status = 'cached';
        outgoing.recursions = 4;

        const content = new Content();

        try {
            await content.resolve(outgoing);
        } catch (error) {
            t.match(
                error.message,
                /Recursion detected - failed to resolve fetching of podlet 4 times/,
            );
            t.notOk(outgoing.success);
        }
        t.end();
    },
);

tap.test(
    'resolver.content() - kill switch - throwable:false - recursions equals threshold - "outgoing.success" should be true',
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
            content: 'http://does.not.exist.finn.no/index.html',
        };
        outgoing.status = 'cached';
        outgoing.recursions = 4;

        const content = new Content();
        await content.resolve(outgoing);

        t.ok(outgoing.success);
        t.end();
    },
);

tap.test(
    'resolver.content() - "redirects" 302 response should include redirect object',
    async (t) => {
        const server = new PodletServer();
        // @ts-ignore
        server.headersContent = {
            location: 'http://redirects.are.us.com',
        };
        // @ts-ignore
        server.statusCode = 302;
        const service = await server.listen();
        const outgoing = new HttpOutgoing(
            {
                uri: service.options.uri,
                redirectable: true,
                name: 'test',
                maxAge: Infinity,
                timeout: 1000,
            },
            {},
            new HttpIncoming({ headers }),
        );

        // See TODO II
        // @ts-ignore
        const { manifest } = server;
        manifest.content = utils.uriRelativeToAbsolute(
            // @ts-ignore
            server.manifest.content,
            outgoing.manifestUri,
        );

        outgoing.manifest = manifest;
        outgoing.status = 'cached';

        const content = new Content();

        const response = await content.resolve(outgoing);
        t.same(response.redirect, {
            statusCode: 302,
            location: 'http://redirects.are.us.com',
        });

        await server.close();
        t.end();
    },
);

tap.test(
    'resolver.content() - "redirectable" 200 response should not respond with redirect properties',
    async (t) => {
        const server = new PodletServer();
        const service = await server.listen();
        const outgoing = new HttpOutgoing(
            {
                uri: service.options.uri,
                redirectable: true,
                name: 'test',
                maxAge: Infinity,
                timeout: 1000,
            },
            {},
            new HttpIncoming({ headers }),
        );

        // See TODO II
        // @ts-ignore
        const { manifest } = server;
        manifest.content = utils.uriRelativeToAbsolute(
            // @ts-ignore
            server.manifest.content,
            outgoing.manifestUri,
        );

        outgoing.manifest = manifest;
        outgoing.status = 'cached';

        const content = new Content();

        const response = await content.resolve(outgoing);
        t.equal(response.redirect, null);

        await server.close();
        t.end();
    },
);

tap.test(
    'resolver.content() - "redirects" 302 response should not throw',
    async (t) => {
        const server = new PodletServer();
        // @ts-ignore
        server.headersContent = {
            location: 'http://redirects.are.us.com',
        };
        // @ts-ignore
        server.statusCode = 302;
        const service = await server.listen();
        const outgoing = new HttpOutgoing(
            {
                uri: service.options.uri,
                redirectable: true,
                throwable: true,
                name: 'test',
                maxAge: Infinity,
                timeout: 1000,
            },
            {},
            new HttpIncoming({ headers }),
        );

        // See TODO II
        // @ts-ignore
        const { manifest } = server;
        manifest.content = utils.uriRelativeToAbsolute(
            // @ts-ignore
            server.manifest.content,
            outgoing.manifestUri,
        );

        outgoing.manifest = manifest;
        outgoing.status = 'cached';

        const content = new Content();

        const response = await content.resolve(outgoing);
        t.same(response.redirect, {
            statusCode: 302,
            location: 'http://redirects.are.us.com',
        });

        await server.close();
        t.end();
    },
);

tap.test(
    'resolver.content() - "redirects" 302 response - client should follow redirect by default',
    async (t) => {
        const externalService = new HttpServer();
        // @ts-ignore
        externalService.request = (req, res) => {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end('proxied content response');
        };
        const address = await externalService.listen();

        const server = new PodletServer();
        // @ts-ignore
        server.headersContent = {
            location: address,
        };
        // @ts-ignore
        server.statusCode = 302;
        const service = await server.listen();
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

        // See TODO II
        // @ts-ignore
        const { manifest } = server;
        manifest.content = utils.uriRelativeToAbsolute(
            // @ts-ignore
            server.manifest.content,
            outgoing.manifestUri,
        );

        outgoing.manifest = manifest;
        outgoing.status = 'cached';

        const content = new Content();

        const response = await content.resolve(outgoing);

        t.equal(response.success, true, 'response should be successful');
        t.equal(
            response.headers['content-type'],
            'text/html; charset=utf-8',
            'response content-type header should be from proxied service',
        );
        t.equal(
            response.headers['content-length'],
            '24',
            'content-length header should be content length of proxied service response',
        );
        t.equal(outgoing.redirectable, false, 'redirectable should be false');
        t.equal(response.redirect, null, 'redirect should not be set');

        await server.close();
        await externalService.close();
        t.end();
    },
);

tap.test('resolver.content() - should handle unreachable podlet', async (t) => {
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
            new Content().resolve(up),
            new Content().resolve(down),
        ]);
    } catch (e) {
        t.fail(e);
    }

    await server.close();
    t.pass();
});
