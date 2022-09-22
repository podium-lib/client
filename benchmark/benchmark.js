/* eslint-disable no-console */
/* eslint-disable no-plusplus */
/* eslint-disable import/no-extraneous-dependencies */

'use strict';

const Benchmark = require('benchmark');
const Client = require("..");

// Helper for wrapping async functions
// Ref: https://github.com/bestiejs/benchmark.js/issues/176#issuecomment-812163728
function p(fn) {
    return {
      defer: true,
      async fn(deferred) {
        await fn();
        deferred.resolve();
      }
    }
  }

const client = new Client({name: 'bar'});
const component = client.register({
    name: 'foo',
    uri: 'http://localhost:8100/manifest.json',
});

const suite = new Benchmark.Suite()

suite
  .add('.fetch()', p(async () => {
    await component.fetch({});
  }))
  .on('cycle', ev => console.log(String(ev.target)))
  .run({ delay: 0 });
