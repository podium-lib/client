/* eslint-disable no-console */
/* eslint-disable no-plusplus */
/* eslint-disable import/no-extraneous-dependencies */

'use strict';

const benchmark = require('benchmark');
const Client = require("..");

const suite = new benchmark.Suite();

const add = (name, fn) => {
    suite.add(name, fn);
};

const client = new Client();
const component = client.register({
    name: 'foo',
    uri: 'http://localhost:8100/manifest.json',
});

const times = 4;
for (let i = 0; i < times; i++) {
    add(`fetch() - Run ${i}`, {
        defer: true,
        fn(deferred) {
            component
                .fetch({})
                .then(() => {
                    deferred.resolve();
                })
                .catch(error => {
                    console.log(error);
                    deferred.resolve();
                });
        },
    });
}

suite
    .on('cycle', ev => {
        console.log(ev.target.toString());
        if (ev.target.error) {
            console.error(ev.target.error);
        }
    })
    .run();
