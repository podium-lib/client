'use strict';

// https://www.nearform.com/blog/self-detect-memory-leak-node/
// https://medium.com/the-node-js-collection/debugging-node-js-with-google-chrome-4965b5f910f4
// chrome://inspect/#devices

const memwatch = require('memwatch-next');
const Client = require('../');
const http = require('http');
const url = require('url');

memwatch.on('leak', info => {
    console.error('Memory leak detected:', info);
});

memwatch.on('stats', info => {
    console.info('Memory stats:', info);
});

process.on('SIGINT', () => process.exit(1));
process.on('SIGTERM', () => process.exit(1));

const client = new Client();
const component = client.register({
    name: 'foo',
    uri: 'http://localhost:8100/manifest.json',
});

http.createServer((req, res) => {
    const u = url.parse(req.url, true);

    if (u.pathname === '/') {
        component
            .fetch({})
            .then(content => {
                res.writeHead(200, {
                    'Content-Type': 'text/html; charset=utf-8',
                });
                res.end(content);
            })
            .catch(() => {
                res.writeHead(500, {
                    'Content-Type': 'text/plain',
                });
                res.end('Internal server error');
            });
        return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
    return;
}).listen(8000);

console.log('Server listening on port 8000');
