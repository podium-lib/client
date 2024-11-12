import tap from 'tap';
import express from 'express';
import HTTP from '../lib/http.js';

tap.test(
    'should abort the request if it takes longer than the timeout',
    (t) => {
        const app = express();
        app.get('/', (req, res) => {
            setTimeout(() => {
                res.send('OK');
            }, 2000); // longer than the default request timeout
        });

        const server = app.listen(
            {
                host: '0.0.0.0',
                port: 0,
            },
            () => {
                const url = `http://${server.address().address}:${server.address().port}/`;
                const options = {
                    method: /** @type {'GET'} */ ('GET'),
                };

                t.rejects(
                    async () => {
                        const http = new HTTP();
                        await http.request(url, options);
                    },
                    {
                        name: 'AbortError',
                        message: 'This operation was aborted',
                    },
                ).finally(() => {
                    server.close();
                    t.end();
                });
            },
        );
    },
);

tap.test(
    'should not timeout if there are multiple requests in flight and one of them fails',
    (t) => {
        const app = express();

        app.get('/fast', (req, res) => {
            res.send('OK');
        });

        app.get('/slow', (req, res) => {
            setTimeout(() => {
                res.send('OK');
            }, 2000); // longer than the default request timeout
        });

        const server = app.listen(
            {
                host: '0.0.0.0',
                port: 0,
            },
            () => {
                const options = {
                    method: /** @type {'GET'} */ ('GET'),
                };

                t.rejects(
                    async () => {
                        const http = new HTTP();
                        await Promise.all([
                            http.request(
                                `http://${server.address().address}:${server.address().port}/slow`,
                                options,
                            ),
                            http.request(
                                `http://${server.address().address}:${server.address().port}/fast`,
                                options,
                            ),
                        ]);
                    },
                    {
                        name: 'AbortError',
                        message: 'This operation was aborted',
                    },
                ).finally(() => {
                    server.close();
                    t.end();
                });
            },
        );
    },
);
