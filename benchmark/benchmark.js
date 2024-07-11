/* eslint-disable no-unused-vars */

import Benchmark from 'benchmark';
import { HttpIncoming } from '@podium/utils';
import PodiumClient from '../lib/client.js';
import { request } from 'undici';

// Helper for wrapping async functions
// Ref: https://github.com/bestiejs/benchmark.js/issues/176#issuecomment-812163728
function p(fn) {
    return {
        defer: true,
        async fn(deferred) {
            await fn();
            deferred.resolve();
        },
    };
}

const podiumClient = new PodiumClient({ name: 'bar' });
const component = podiumClient.register({
    name: 'foo',
    uri: 'http://localhost:8100/manifest.json',
});

const incoming = new HttpIncoming({
    headers: {
        host: 'localhost:3030',
    },
    hostname: 'localhost',
    url: '/some/path?foo=bar',
});

const suite = new Benchmark.Suite();

suite
    .add(
        'base',
        p(async () => {
            const { statusCode, headers, body } = await request(
                'http://localhost:8100/index.html',
            );
            const data = await body.text();
        }),
    )
    .add(
        '.fetch()',
        p(async () => {
            await component.fetch(incoming);
        }),
    )
    .on('cycle', (ev) => console.log(String(ev.target)))
    .run({ delay: 0 });
