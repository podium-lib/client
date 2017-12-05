'use strict';

const utils = require('../lib/utils');

// ref: https://github.com/nodejs/node/issues/17448

for (let i = 0; i < 1000001; i++) {
    utils.uriBuilder('foo', 'https://foo.domain.test.com/');
    if (i % 10000 === 0) {
        console.log(process.memoryUsage().rss);
    }
}
