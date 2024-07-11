'use strict';

const http = require('http');
const httpProxy = require('http-proxy');

const addresses = [
    {
        host: 'localhost',
        port: parseInt(process.argv[2], 10) + 1,
    },
    {
        host: 'localhost',
        port: parseInt(process.argv[2], 10) + 2,
    },
    {
        host: 'localhost',
        port: parseInt(process.argv[2], 10) + 3,
    },
];

const proxy = httpProxy.createServer();

http.createServer((req, res) => {
    const target = {
        target: addresses.shift(),
    };

    console.log(
        'balancing request to:',
        `http://${target.target.host}:${target.target.port}`,
    );
    proxy.web(req, res, target);

    addresses.push(target.target);
}).listen(process.argv[2], () => {
    console.log('proxy running at port:', process.argv[2]);
});
