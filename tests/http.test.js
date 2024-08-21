import { test } from 'node:test';
import { rejects } from 'node:assert';
import HTTP from '../lib/http.js';

test('should abort the request if it takes longer than the timeout', async (t) => {
    // Mock the undici.Client's request method
    const mockRequestFn = async (url, { signal }) => {
        return new Promise((resolve, reject) => {
            // Simulate a delay longer than the timeout
            setTimeout(() => {
                if (signal.aborted) {
                    const abortError = new Error(
                        'Request aborted due to timeout',
                    );
                    abortError.name = 'AbortError';
                    reject(abortError);
                } else {
                    resolve({
                        statusCode: 200,
                        headers: {},
                        body: 'OK',
                    });
                }
            }, 2000); // 2 seconds delay
        });
    };

    // @ts-ignore
    const http = new HTTP(mockRequestFn);
    const url = 'https://example.com/test';
    const options = {
        method: /** @type {'GET'} */ ('GET'),
        timeout: 1000, // 1 second timeout
    };

    // Assert that the request is rejected with an AbortError
    await rejects(
        http.request(url, options),
        (/** @type {Error} */ err) =>
            err.name === 'AbortError' &&
            err.message === 'Request aborted due to timeout',
        'Expected request to be aborted due to timeout',
    );
});
