'use strict';

const express = require('express');
const Client = require('../..');

const PORT = parseInt(process.argv[2], 10);

const client = new Client({
    logger: console,
});
client.on('dispose', (key) => {
    console.log('event - manifest disposed -', key);
});
client.on('change', (key) => {
    console.log('event - manifest changed -', key);
});

client.register({
    name: 'podlet',
    uri: 'http://localhost:7010/manifest.json',
});

const app = express();

app.get('/', (req, res) => {
    client.podlet
        .fetch({})
        .then((html) => {
            res.status(200).send(html);
        })
        .catch((error) => {
            console.error(error);
            res.status(500).send('Internal server error');
        });
});

app.get('/stream', (req, res) => {
    const stream = client.podlet.stream({});
    stream.on('error', (error) => {
        console.log(error);
    });
    stream.pipe(res);
});

app.listen(PORT, () => {
    console.log('layout server running');
    console.log(`http://localhost:${PORT}`);
});
