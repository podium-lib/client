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
                    'Request aborted due to timeout',
                    'Expected request to be aborted due to timeout',
                ).finally(() => {
                    server.close();
                    t.end();
                });
            },
        );
    },
);
