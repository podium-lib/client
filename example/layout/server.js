'use strict';

const express = require('express');
const PodiumClient = require('../../');
const client = new PodiumClient();

const PORT = parseInt(process.argv[2], 10);

const podlet = client.register({
    consumerName: 'test',
    uri: 'http://localhost:7010/manifest.json',
    fallback: 'client fallback',
    timeout: 10
});

const app = express();
app.get('/', (req, res, next) => {
    podlet.fetch((html) => {
        res.status(200).send(html);
    });
});

app.listen(PORT, () => {
    console.log('layout server running');
    console.log(`http://localhost:${PORT}`);
});






/*
    - on fetch
      - get manifest from cache
        - no manfest, fetch it manifest
        - have cached manifest, fetch content
          - content header version matches previous manifest version
            - terminate request, fetch content again since we probably are in a deploy state
          - content header version does not match current manifest version
            - terminate request, fetch manifest since there is a new one
          - content header version matches manifest version
            - continue with request

*/
