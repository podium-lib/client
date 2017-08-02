'use strict';

const manifest = require('./public/manifest.json');
const express = require('express');

const PORT = parseInt(process.argv[2], 10);

const app = express();

app.use((req, res, next) => {
    res.setHeader('podlet-version', manifest.version);
    next();
});

app.use(express.static('public'));

app.get('/foo.html', (req, res, next) => {
    res.status(200).send('<div>halla foo.html</div>');
});

app.listen(PORT, () => {
    console.log(`podlet server running - version: ${manifest.version}`);
    console.log(`http://localhost:${PORT}`);
});
