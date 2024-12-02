/* eslint-disable no-unused-vars */
import tap from 'tap';
import TtlMemCache from 'ttl-mem-cache';
import { PodletServer } from '@podium/test-utils';
import { HttpIncoming } from '@podium/utils';
import Resolver from '../lib/resolver.js';
import HttpOutgoing from '../lib/http-outgoing.js';

tap.test('resolver() - object tag - should be PodletClientResolver', (t) => {
    const resolver = new Resolver(new TtlMemCache());
    t.equal(
        Object.prototype.toString.call(resolver),
        '[object PodletClientResolver]',
    );
    t.end();
});

tap.test(
    'resolver() - "registry" not provided to constructor - should throw',
    (t) => {
        t.throws(() => {
            // @ts-ignore
            const resolver = new Resolver();
        }, 'you must pass a "registry" object to the PodletClientResolver constructor');
        t.end();
    },
);
tap.test(
    'resolver() - emit metrics from the underlying HttpClient',
    async (t) => {
        const outgoing = new HttpOutgoing({
            name: 'test',
            timeout: 1000,
            uri: 'http://some.org',
            maxAge: Infinity,
        });

        const resolver = new Resolver(new TtlMemCache());

        function verify(stream) {
            return new Promise((resolve) => {
                const metrics = [];
                stream.on('data', (metric) => {
                    if (metric.name.indexOf('podium') !== -1) {
                        metrics.push(metric);
                    }
                });
                stream.on('end', async () => {
                    t.equal(metrics.length, 1);
                    t.equal(
                        metrics[0].name,
                        'podium_client_resolver_manifest_resolve',
                    );
                    t.equal(metrics[0].type, 5);
                    resolve();
                });
            });
        }
        await resolver.resolve(outgoing);
        resolver.metrics.push(null);
        await verify(resolver.metrics);
        t.end();
    },
);
