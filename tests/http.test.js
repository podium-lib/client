import { test } from 'node:test';
import { rejects } from 'node:assert';
import express from 'express';
import HTTP from '../lib/http.js';

test('should abort the request if it takes longer than the timeout', async () => {
    const app = express();
    app.get('/test', (req, res) => {
        setTimeout(() => {
            res.send('OK');
        }, 2000); // longer than the default request timeout
    });
    const server = app.listen({
        port: 4321,
        host: 'localhost',
    });

    const http = new HTTP();
    const url = `http://localhost:4321/test`;
    const options = {
        method: /** @type {'GET'} */ ('GET'),
    };

    // Assert that the request is rejected with an AbortError
    await rejects(
        http.request(url, options),
        (/** @type {Error} */ err) =>
            err.name === 'AbortError' &&
            err.message === 'Request aborted due to timeout',
        'Expected request to be aborted due to timeout',
    );
    server.close();
});
