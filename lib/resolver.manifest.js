'use strict';

const request = require('request');
const http = require('http');

const HTTP_AGENT = new http.Agent({
    keepAlive: true,
    maxSockets: 10,
    maxFreeSockets: 10,
    timeout: 60000,
    keepAliveMsecs: 30000
});


module.exports = function(state) {
    return new Promise((resolve, reject) => {
        if (state.manifest) {
//            console.log('manifest - have manifest from cache');
            return resolve(state);
        }

//        console.log('manifest - do not have manifest - start fetching');
        request({
            method: 'GET',
            agent: HTTP_AGENT,
            json: true,
            uri: state.uri,
        }, (error, response, body) => {
            if (error) {
//                console.log('manifest - error');
                return reject(error);
            }
            if (response.statusCode !== 200) {
//                console.log('manifest - http error', response.statusCode);
                return reject(error);
            }

/*
            // fixme: handle multiple requests to manifest where version in manifest equals current
            this.versions.previous = this.versions.current;
            this.versions.current = body.version;
*/

//            console.log('manifest - got manifest from podlet');
            state.manifest = body;
            resolve(state);
        });

    });
}
