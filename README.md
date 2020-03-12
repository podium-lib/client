# @podium/client

Client for fetching podium component fragments over HTTP.

[![Dependencies](https://img.shields.io/david/podium-lib/client.svg)](https://david-dm.org/podium-lib/client)
[![GitHub Actions status](https://github.com/podium-lib/client/workflows/Run%20Lint%20and%20Tests/badge.svg)](https://github.com/podium-lib/client/actions?query=workflow%3A%22Run+Lint+and+Tests%22)
[![Known Vulnerabilities](https://snyk.io/test/github/podium-lib/client/badge.svg?targetFile=package.json)](https://snyk.io/test/github/podium-lib/client?targetFile=package.json)

This module is intended for internal use in Podium and is not a module an end
user would use directly. End users will typically interact with this module
through higher level modules such as the [@podium/layout].

## Installation

```bash
$ npm install @podium/client
```

## Simple stream usage

Connect to a Podium component server and stream the HTML content:

```js
const { HttpIncoming } = require('@podium/utils');
const Client = require('@podium/client');
const client = new Client();

const component = client.register({
    name: 'foo',
    uri: 'http://foo.site.com/manifest.json',
});

const stream = component.stream(new HttpIncoming());
stream.once('beforeStream', res => {
    console.log(res.headers);
    console.log(res.css);
    console.log(res.js);
});
stream.on('error', error => {
    console.log(error);
});
stream.pipe(process.stdout);
```

## Simple fetch usage

Connect to a podium component server and fetch the HTML content:

```js
const { HttpIncoming } = require('@podium/utils');
const Client = require('@podium/client');
const client = new Client();

const component = client.register({
    name: 'foo',
    uri: 'http://foo.site.com/manifest.json',
});

component
    .fetch(new HttpIncoming())
    .then(res => {
        console.log(res.content);
        console.log(res.headers);
        console.log(res.css);
        console.log(res.js);
    })
    .catch(error => {
        console.log(error);
    });
```

## Constructor

Create a new Client instance.

```js
const Client = require('@podium/client');
const client = new Client(options);
```

The client instance is iterable and holds a reference to each registered
resource.

```js
const Client = require('@podium/client');
const client = new Client();

client.register({ uri: 'http://foo.site.com/manifest.json', name: 'fooBar' });
client.register({ uri: 'http://bar.site.com/manifest.json', name: 'barFoo' });

for (let resource of client) {
    resource.fetch();
}
```

### options (optional)

An options object containing configuration. The following values can be
provided:

-   `retries` - {Number} - The number of times the client should retry to settle a version number conflict before terminating. See the section "[on retrying](#on-retrying)" for more information. Default: 4
-   `timeout` - {Number} - Default value, in milliseconds, for how long a request should wait before the connection is terminated. Default: 1000
-   `maxAge` - {Number} - Default value, in milliseconds, for how long manifests should be cached. Default: Infinity
-   `agent` - {HTTPAgent} - Default HTTP Agent used for all requests.
-   `logger` - {Object} - A logger which conforms to the log4j interface. See the docs for [abslog](https://www.npmjs.com/package/abslog) for more information.
-   `resolveThreshold` - {Number} - How long, in milliseconds, update resolving should wait before entering `stable` state. See the section "[Podlet update life cycle](#podlet-update-life-cycle)" for more information. Default: 10000 (10 seconds).
-   `resolveMax` - {Number} - How long, in milliseconds, update resolving should wait before entering `unhealthy` state. See the section "[Podlet update life cycle](#podlet-update-life-cycle)" for more information. Default: 240000 (4 minutes).

## API

The Client instance has the following API:

### .register(options)

Registers a component.

Example:

```js
const Client = require('@podium/client');
const client = new Client();

const component = client.register({
    uri: 'http://foo.site.com/manifest.json',
    name: 'fooBar',
});
```

Returns a Resource Object.

The created Resource Object is also stored on the instance of the client.
It is stored with the `name` as its property name.

Example:

```js
const Client = require('@podium/client');
const client = new Client();

client.register({ uri: 'http://foo.site.com/manifest.json', name: 'fooBar' });
client.fooBar.fetch();
```

#### options (required)

The following values can be provided:

-   `uri` - {String} - Uri to the manifest of a podium component - Required
-   `name` - {String} - Name of the component. This is used to reference the component in your application, and does not have to match the name of the component itself - Required
-   `retries` - {Number} - The number of times the client should retry to settle a version number conflict before terminating. See the section "[on retrying](#on-retrying)" for more information. Default: 4 - Optional.
-   `timeout` - {Number} - Defines how long, in milliseconds, a request should wait before the connection is terminated. Overrides the global default. Default: 1000 - Optional.
-   `throwable` - {Boolean} - Defines whether an error should be thrown if a failure occurs during the process of fetching a podium component. Defaults to `false` - Optional.
-   `resolveJs` - {Boolean} - Defines whether to resolve a relative JS uri for a component to be an absolute uri. Defaults to `false` - Optional.
-   `resolveCss` - {Boolean} - Defines whether to resolve a relative CSS uri for a component to be an absolute uri. Defaults to `false` - Optional.

### .js()

Retrieve list of all JavaScript references from all registered and fetched
components.

```js
const Client = require('@podium/client');
const client = new Client();

const foo = client.register({
    uri: 'http://foo.site.com/manifest.json',
    name: 'foo',
});
const bar = client.register({
    uri: 'http://bar.site.com/manifest.json',
    name: 'bar',
});

await Promise.all([foo.fetch(), bar.fetch()]);

client.js(); // Array of js entries
```

### .css()

Retrieve a list of all CSS references from all registered and fetched
components.

```js
const Client = require('@podium/client');
const client = new Client();

const foo = client.register({
    uri: 'http://foo.site.com/manifest.json',
    name: 'foo',
});
const bar = client.register({
    uri: 'http://bar.site.com/manifest.json',
    name: 'bar',
});

await Promise.all([foo.fetch(), bar.fetch()]);

client.css(); // Array of css entries
```

### .refresh()

This method will refresh a resource by reading its manifest and fallback
if defined in the manifest. The method will not call the URI to the content
of a component.

If the internal cache in the client already has a manifest cached, this will
be thrown away and replaced when the new manifest is successfully fetched. If a
new manifest cannot be successfully fetched, the old manifest will be kept in
cache.

If a manifest is successfully fetched, this method will resolve with a `true`
value. If a manifest is not successfully fetched, it will resolve with `false`.

```js
const Client = require('@podium/client');
const client = new Client();

client.register({ uri: 'http://foo.site.com/manifest.json', name: 'foo' });

console.log(client.js()); // []

const status = await client.refresh();

console.log(status); // true
console.log(client.js()); // ['foo.js', 'bar.js']
```

### .refreshManifests()

Refreshes the manifests of all registered resources. Does so by calling the
`.refresh()` method on all resources under the hood.

```js
const Client = require('@podium/client');
const client = new Client();

client.register({ uri: 'http://foo.site.com/manifest.json', name: 'foo' });
client.register({ uri: 'http://bar.site.com/manifest.json', name: 'bar' });

console.log(client.js()); // []
console.log(client.css()); // []

await client.refreshManifests();

console.log(client.js()); // ['foo.js', 'bar.js']
console.log(client.css()); // ['foo.css', 'bar.css']
```

### .dump()

Returns an Array of all loaded manifests ready to be used by `.load()`.

### .load()

Loads an Array of manifests, provided by `.dump()`, into the client. If any of
the items in the loaded Array contains a key which is already in the cache
the entry in the cache will be overwritten.

If any of the entries in the loaded Array are not compatible with the format
which `.dump()` exports, they will not be inserted into the cache.

Returns an Array with the keys which were inserted into the cache.

## Properties

The Client instance has the following properties:

### .metrics

Property that exposes a metric stream. This stream joins all internal metrics
streams into one stream resulting in all metrics from all sub modules being
exposed here.

Please see [@metrics/metric] for full documentation.

### .state

What state the client is in. See the section
"[Podlet update life cycle](#podlet-update-life-cycle)" for more information.

The event will fire with the following value:

-   `instantiated` - When a `Client` has been instantiated but no requests to any podlets has been made.
-   `initializing` - When one or multiple podlets are requested for the very first time.
-   `unstable` - When an update of a podlet is detected and is in the process of refetching the manifest.
-   `stable` - When all registered podlets are using cached manifests and only fetching content.
-   `unhealthy` - When an update of a podlet never settled.

## Events

The Client instance emits the following events:

### state

When there is a change in state. See the section
"[Podlet update life cycle](#podlet-update-life-cycle)" for more information.

```js
const client = new Client();
client.on('state', state => {
    console.log(state);
});

const resource = client.register({
    uri: 'http://foo.site.com/manifest.json',
    name: 'foo',
});

resource.fetch();
```

The event will fire with the following value:

-   `initializing` - When one or multiple podlets are requested for the very first time.
-   `unstable` - When an update of a podlet is detected and is in the process of refetching the manifest.
-   `stable` - When all registered podlets are using cached manifests and only fetching content.
-   `unhealthy` - When an update of a podlet never settled.

### change (deprecated)

When there is a change in version number between the cached manifest held
by the client and the manifest on the remote source.

The event will fire after a new version of the manifest on the remote
source is fetched.

Emits the new manifest.

```js
const client = new Client();
client.on('change', manifest => {
    console.log(manifest);
});

const resource = client.register({
    uri: 'http://foo.site.com/manifest.json',
    name: 'foo',
});
```

## Podium Resource Object

A registered Podium component is stored in a Podium Resource Object.

The Podium Resource Object contains methods for retrieving the content of a
Podium component. The URI to the content of a component is defined in the
component's manifest. This is the content root of the component.

A Podium Resource Object has the following API:

### .fetch(incoming, options)

Fetches the content of the component. Returns a `Promise` which resolves with a
Response object containing the keys `content`, `headers`, `css` and `js`.

#### incoming (required)

A HttpIncoming object. See https://github.com/podium-lib/utils/blob/master/lib/http-incoming.js

#### options (optional)

An options object containing configuration. The following values can be
provided:

-   `pathname` - {String} - A path which will be appended to the content root of the component when requested.
-   `headers` - {Object} - An Object which will be appended as http headers to the request to fetch the component's content.
-   `query` - {Object} - An Object which will be appended as query parameters to the request to fetch the component's content.

#### return value

```js
const result = await component.fetch();
console.log(result.content);
console.log(result.js);
console.log(result.css);
```

### .stream(incoming, options)

Streams the content of the component. Returns a `ReadableStream` which streams
the content of the component. Before the stream starts flowing a `beforeStream`
with a Response object, containing `headers`, `css` and `js` references is
emitted.

#### incoming (required)

A HttpIncoming object. See https://github.com/podium-lib/utils/blob/master/lib/http-incoming.js

#### options (optional)

An options object containing configuration. The following values can be
provided:

-   `pathname` - {String} - A path which will be appended to the content root of the component when requested.
-   `headers` - {Object} - An Object which will be appended as http headers to the request to fetch the component's content.
-   `query` - {Object} - An Object which will be appended as query parameters to the request to fetch the component's content.

### .name

A property returning the name of the podium resource. This is the name provided
during the call to `register`.

### .uri

A property returning the location of the podium resource.

### Events

#### beforeStream

A `beforeStream` event is emitted before the stream starts flowing. An response
object with keys `headers`, `js` and `css` is emitted with the event.

`headers` will always contain the response headers from the podlet. If the
resource manifest defines JavaScript assets, `js` will contain the value from
the manifest file otherwise `js` will be an empty string. If the resource
manifest defines CSS assets, `css` will contain the value from the manifest file
otherwise `css` will be an empty string.

```js
const stream = component.stream();
stream.once('beforeStream', data => {
    console.log(data.headers);
    console.log(data.css);
    console.log(data.js);
});
```

## Controlling caching of the manifest

The client has an internal cache where it keeps a cached version of the manifest
for each registered Podium component.

By default all manifests are cached for 24 hours unless a new version of the
manifest is detected by a change in the `podlet-version` HTTP header on the
content URI. When this happens, the cache is thrown away and the fresh version
of the manifest is cached.

The default length of time the manifest is cached for can be configured by
setting `maxAge` in the constructor of the client.

```js
const client = new Client({ maxAge: 1000 * 60 * 60 * 4 });
```

It is also possible to control how long a manifest should be cached in the
client from a Podium component. This is done by setting a [RFC 7234] compatible
HTTP header on the manifest on the server serving the Podium component.

Example: This will cache the manifest for 1 hour:

```js
const app = express();
app.get('/manifest.json', (req, res) => {
    res.setHeader('cache-control', 'public, max-age=3600');
    res.status(200).json({
        name: 'foo',
        content: '/index.html',
    });
});
```

## Defining a component as throwable

By default the client will never throw if something fails in the process of
retreiving the manifest, the fallback or the content itself. It will simply
provide a fallback if it has one or an empty String for the resource in an error
situation.

There are however, cases where throwing an error is more appropriate. This can
be achieved by setting the option `throwable` to `true` in the `.register()`
method. If an error is thrown in the process of retrieving the manifest, the
fallback or the content then it can then be acted upon.

Example:

```js
const Client = require('@podium/client');
const client = new Client();

const foo = client.register({
    name: 'foo',
    uri: 'http://foo.site.com/manifest.json',
});

const bar = client.register({
    name: 'bar',
    uri: 'http://bar.site.com/manifest.json',
    throwable: true,
});

Promise.all([foo.fetch(), bar.fetch()])
    .then(res => {
        console.log(res.content);
    })
    .catch(error => {
        console.log(error);
    });
```

In this example, the `catch` will be triggered if `bar` encounters an error in
the process of retrieving content from the remote. If the same happens with
`foo` the `catch` will NOT be triggered.

When a resource is flagged as throwable and it throws an error the error will be
an enriched [boom] with detailed information on what went wrong.

```js
try {
    const result = await foo.fetch();
} catch (err) {
    // err.statusCode === 404
}
```

The error object will reflect the http status code of the remote. In other
words; if the remote responded with a 404, the `statusCode` in the error object
will be 404.

One exceptional case is when the podlet responds with a `3xx` code. In this case, the error object's `isRedirect` property will be set to true and a property `redirectUrl` will be included. The client itself will not follow redirects, it is up to you to do so.

```js
try {
    const result = await foo.fetch();
} catch (err) {
    // err.statusCode === 302
    // err.isRedirect === true
    // err.redirectUrl === 'http://redirects.are.us.com'
}
```

## Podlet update life cycle

A podlets main entry is a manifest which contains metadata about that component.
This manifest is fetched on the first request to the podlet and cached by the
client together with its fallback content if a fallback has been defined in the
manifest. On the second and subsequent requests for a podlet the manifest is
read from the internal cache in the client and the client goes straight to
fetching the content.

Detection of updates to a component is done by the content route in the
component serving an HTTP header with the same version number as in the
component's manifest and if the client detects a difference between the HTTP
header version number and the version in the manifest cached in the client, the
component has changed.

In the event of an update the client will throw away the cached manifest and
make multiple HTTP requests to refetch the manifest, fallback and content.

### On retrying

In a distributed system there can be windows where a component can exist with
two versions at the same time during a rolling deploy. In such a scenario the
client might go into an "update loop" due to hitting different versions of the
component.

In a rolling deploy this is not nessessery a bad thing. But to protect both the
application using the client and the component itself, the client will terminate
the process of updating if such an "update loop" is detected.

This feature will also protect against cases where there might be a mismatch
between the version number in a manifest file and what's set as a header on the
content route.

How many times the client will retry settling an update before termination can
be set by the `retries` argument in the client constructor and the `.register()`
method.

### Missing version header

There might be error situations where a content route is missing the version
header so the client does not have anything to compare the version in the
manifest against. In such a situation the client will continue to fetch the
content, but the manifest and its fallback will never be re-evaluated for an
update.

### Health status

During the life cycle of updating one or more podlets the client will be in
different states. The state is a representation of all registered podlets in the
client. In other words; if one of five podlets enters a given state, the state
is representative for all five podlets.

These states are:

-   `instantiated` - When a `Client` has been instantiated but no requests to any podlets has been made.
-   `initializing` - When one or multiple podlets are requested for the very first time. This state will only happen after `instantiated`.
-   `unstable` - When an update of a podlet is detected and is in the process of refetching the manifest.
-   `stable` - When all registered podlets are using cached manifests and only fetching content.
-   `unhealthy` - When an update of a podlet never settled. For instance, if a podlet is stuck in an "update loop".

The most common state is `stable`.

When a podlet is updated and the client detects this the client will enter
`unstable` state. This state will live for a given time and depends on how
the deployment of a podlet is done. For example, during a rolling deploy of a
podlet, the `unstable` state will live as long as the podlet exists in two
different versions during deployment plus some additional extra time afterward
to ensure everything has settled. The duration of this window can be configured
using the `resolveThreshold` argument in the `Client` constructor.

When a podlet update is detected the client will also start to monitor if the
new podlet gets into a stable state within a given time. In other words; if a
podlet enters an "update loop" as described above, the client will detect this
and after a given time set the state to `unhealthy`. How long it should go
before the `unhealthy` state is entered can be configured by the `resolveMax`
argument on the `Client` constructor.

The state can be checked by the `.state` property on the `Client` object. The
client will also emit a `state` event each time the client enters one of the
above states.

## License

Copyright (c) 2019 FINN.no

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

[@metrics/metric]: https://github.com/metrics-js/metric '@metrics/metric'
[@podium/layout]: https://github.com/podium-lib/layout '@podium/layout'
[rfc 7234]: https://tools.ietf.org/html/rfc7234 'RFC 7234'
[boom]: https://github.com/hapijs/boom 'Boom'
