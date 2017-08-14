'use strict';

const express = require('express');
const PodiumClient = require('../../');

const PORT = parseInt(process.argv[2], 10);

const client = new PodiumClient();
client.on('dispose', (key) => {
    console.log('disposing cache -', key);
});

const podlet = client.register({
    uri: 'http://localhost:7010/manifest.json'
});
podlet.on('info', (info) => {
    console.log(info);
});

const app = express();
app.get('/', (req, res, next) => {
    console.log(`FETCH ::  ${Date.now()}`)
    podlet.fetch().then((html) => {
        res.status(200).send(html);
    }).catch((error) => {
        res.status(500).send('Internal server error');
    });
});

app.get('/stream', (req, res, next) => {
    console.log(`STREAM :: ${Date.now()}`)

    const stream = podlet.stream();
    stream.on('error', (error) => {
        console.log(error)
    })
    stream.pipe(res);
});

app.listen(PORT, () => {
    console.log('layout server running');
    console.log(`http://localhost:${PORT}`);
});
