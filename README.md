# @podium/client

[![Build Status](https://travis.schibsted.io/Podium/podlet-client.svg?token=qt273uGfEz64UyWuNHJ1&branch=master)](https://travis.schibsted.io/Podium/podlet-client)

Client for fetching podium component fragments over http.


## Installation

```bash
$ npm i @podium/client --save
```


## Simple stream usage

Connect to a podium component server and stream the html content:

```js
const Client = require('@podium/client');
const client = new Client();

const component = client.register({
    name: 'foo',
    uri: 'http://foo.site.com/manifest.json'
});

const stream = component.stream();
stream.on('error', (error) => {
    console.log(error)
});
stream.pipe(process.stdout);
```

## Simple fetch usage

Connect to a podium component server and fetch the html content:

```js
const Client = require('@podium/client');
const client = new Client();

const component = client.register({
    name: 'foo',
    uri: 'http://foo.site.com/manifest.json'
});

component.fetch().then((content) => {
    console.log(content);
}).catch((error) => {
    console.log(error);
});
```


## Constructor

Create a new Client instance.

```js
const Client = require('@podium/client');
const client = new Client(options);
```

The client instance are iterable and hold each registered resource.

```js
const Client = require('@podium/client');
const client = new Client();

client.register({uri: 'http://foo.site.com/manifest.json', name: 'fooBar'});
client.register({uri: 'http://bar.site.com/manifest.json', name: 'barFoo'});

for (let resource of client) {
    resource.fetch();
}
```

### options (optional)

An options object containing configuration. The following values can be provided:

 * `timeout` - {Number} - Default value, in milliseconds, for how long a request should wait before connection is terminated. Default: 1000
 * `maxAge` - {Number} - Default value, in milliseconds, for how long manifests should be cached. Default: Infinity
 * `agent` - {HTTPAgent} - Default HTTP Agent used for all requests.
 * `logger` - {Object} - A logger which conform to a log4j interface. See the doc for the internal [abstract logger](https://www.npmjs.com/package/abslog) for more information.


## API

The Client instance have the following API:

### .register(options)

Registers a podlet.

Example:

```js
const Client = require('@podium/client');
const client = new Client();

const component = client.register({uri: 'http://foo.site.com/manifest.json', name: 'fooBar'});
```

Returns a Resource Object.

The created Resource Object is also stored on the instance of the client.
It is stored with the `name` as property name.

Example:

```js
const Client = require('@podium/client');
const client = new Client();

client.register({uri: 'http://foo.site.com/manifest.json', name: 'fooBar'});
client.fooBar.fetch();
```

#### options (required)

The following values can be provided:

 * `uri` - {String} - Uri to the manifest of a podium component - Required
 * `name` - {String} - Name of the podlet. This is used to reference the podlet in your application, and does not have to match the name of the podlet itself - Required
 * `timeout` - {Number} - How long, in milliseconds, the request should wait before connection is terminated. Overrides the global default. Default: 1000 - Optional.
 * `throwable` - {Boolean} - If it should be thrown an error if something fails during the process of fetching a podium component. Defaults to `false` - Optional.
 * `resolveJs` - {Boolean} - Resolve a relative js uri in the podlet to be absolute uri. Defaults to `false` - Optional.
 * `resolveCss` - {Boolean} - Resolve a relative css uri in the podlet to be absolute uri. Defaults to `false` - Optional.

### .js()

Retrieve list of all js references from all registered and fetched podlets.

```js
const Client = require('@podium/client');
const client = new Client();

const foo = client.register({uri: 'http://foo.site.com/manifest.json', name: 'foo'});
const bar = client.register({uri: 'http://bar.site.com/manifest.json', name: 'bar'});

await Promise.all([
    foo.fetch(),
    bar.fetch()
]);

client.js(); // Array of js entries
```

### .css()

Retrieve list of all css references from all registered and fetched podlets.

```js
const Client = require('@podium/client');
const client = new Client();

const foo = client.register({uri: 'http://foo.site.com/manifest.json', name: 'foo'});
const bar = client.register({uri: 'http://bar.site.com/manifest.json', name: 'bar'});

await Promise.all([
    foo.fetch(),
    bar.fetch()
]);

client.css(); // Array of css entries
```

### refreshManifests()

Refreshes the manifests of all registered resources.

```js
const Client = require('@podium/client');
const client = new Client();

client.register({uri: 'http://foo.site.com/manifest.json', name: 'foo'});
client.register({uri: 'http://bar.site.com/manifest.json', name: 'bar'});

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
the items in the loaded Array contains a key which already are in the cache
the entry in the cache will be overwritten.

If any of the entries in the loaded Array are not compatible with the format
which `.dump()` exports, they will not be inserted into the cache.

Returns and Array with the keys which was inserted into the cache.

## Events

The client emit the following events:

### change

When there is a change in version number between the cached manifest held
by the client and the manifest on the remote source.

The event will fire after the a new version of the manifest on the remote
source is fetched.

Emits the new manifest.

```js
const client = new Client();
client.on('change', manifest => {
    console.log(manifest);
});

const resource = client.register({uri: 'http://foo.site.com/manifest.json', name: 'foo'});
```


## Podium Resource Object

A registered Podium component is stored in a Podium Resource Object.

The Podium Resource Object contain methods for retrieving the content of a
Podium component. The URI to the content of a component is defined in the
component's manifest. This is the content root of the component.

A Podium Resource Object has the following API:

### .fetch(podiumContext, options)

Fetches the content of the component. Returns a `Promise`.

#### podiumContext (required)

The Podium Context. See https://github.schibsted.io/finn/podium/tree/master/packages/podium-context

#### options (optional)

An options object containing configuration. The following values can be provided:

 * `pathname` - {String} - A path which will be appended to the content root of the component when requested.
 * `query` - {Object} - An Object which will be appended as query parameters to the request to the component content.

### .stream(podiumContext, options)

Streams the content of the component. Returns a `ReadStream`.

#### podiumContext (required)

The Podium Context. See https://github.schibsted.io/finn/podium/tree/master/packages/podium-context

#### options (optional)

An options object containing configuration. The following values can be provided:

 * `pathname` - {String} - A path which will be appended to the content root of the component when requested.
 * `query` - {Object} - An Object which will be appended as query parameters to the request to the component content.


### .name


A property returning the name of the podium resource.
This is the name provided during the call to `register`.

### .uri

A property returning the location of the podium resource.


## Controlling caching of the manifest

The client has an internal cache where it keep a cached version of the
manifest for each registered Podium component.

By default all manifest are cached 24 hours unless its detected a new
version of the manifest by a change in the `podlet-version` http header
on the content URI. Then the cache is thrown and fresh version of the
manifest is cached.

The default length of time the manifests is cached can be configured
by setting `maxAge` on the constructor of the client.

```js
const client = new Client({ maxAge: (1000 * 60 * 60 * 4) });
```

It is also possible to control how long a manifest should be cached in
the client from a Podium component. This is done by setting a [RFC 7234](https://tools.ietf.org/html/rfc7234)
compatible http header on the manifest on the server serving the
Podium component.

Example: This will cache the manifest for 1 hour:

```js
const app = express();
app.get('/manifest.json', (req, res) => {
    res.setHeader('cache-control', 'public, max-age=3600');
    res.status(200).json({
        name: 'foo',
        content: '/index.html'
    });
});
```

## On defining throwable

By default the client will never throw if something fails in the process
of retreiving the manifest, the fallback or the content itself. It will
simply provide a fallback if it has one or an empty String for the
resource in an error situation.

Though; there are cases where one would like to throw an error one can
act upon if there are errors in the process of retrieving the manifest,
the fallback or the content.

One can do so by setting the option `throwable` to `true` on the
`.register()` method.

Example:

```js
const Client = require('@podium/client');
const client = new Client();

const foo = client.register({
    name: 'foo',
    uri: 'http://foo.site.com/manifest.json'
});

const bar = client.register({
    name: 'bar',
    uri: 'http://bar.site.com/manifest.json',
    throwable: true
});

Promise
    .all([foo.fetch(), bar.fetch()])
    .then((content) => {
        console.log(content);
    }).catch((error) => {
        console.log(error);
    });
```

In this example, the `catch` will be triggered if `bar` encounters
an error in the process of retrieving content from the remote.
If the same happens with `foo` the `catch` will NOT be triggered.

When a resource is flagged as throwable and it throws an error the
error will be an enriched [boom error object](https://github.com/hapijs/boom)
with detailed information on what went wrong.

The error object will reflect the http status code of the remote.
In other words; if the remote responded with a 404, the `statusCode`
in the error object will be 404.
