'use strict';

const express = require('express');
const PodiumClient = require('../../');
const client = new PodiumClient();

const PORT = parseInt(process.argv[2], 10);

const podlet = client.register({
    uri: 'http://localhost:7010/manifest.json'
});

const app = express();
app.get('/', (req, res, next) => {
    console.log(`################### ${Date.now()}`)
    podlet.fetch().then((html) => {
        res.status(200).send(html);
    }).catch((error) => {
        res.status(500).send('Internal server error');
    });
});

app.listen(PORT, () => {
    console.log('layout server running');
    console.log(`http://localhost:${PORT}`);
});
