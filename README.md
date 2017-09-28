# podlet-client

Client for fetching podium component fragments over http.


## Installation

```bash
$ npm i @podium/podlet-client --save
```

## General overview

TODO!


## Simple stream usage

Connect to a podium component server and stream the html content:

```js
const Client = require('@podium/podlet-client');
const client = new Client();

const component = client.register({
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
const Client = require('@podium/podlet-client');
const client = new Client();

const component = client.register({
    uri: 'http://foo.site.com/manifest.json'
});

component.fetch().then((content) => {
    console.log(content);
}).catch((error) => {
    console.log(error);
});
```


## Constructor

Create a new Podlet Client instance.

```js
const Client = require('@podium/podlet-client');
const client = new Client(options);
```

### options (optional)

An options object containing configuration. The following values can be provided:

 * maxAge - {Number} - Default value, in milliseconds, for how long manifests should be cached. Default: Infinity
 * agent - {HTTPAgent} - Default HTTP Agent used for all requests.


## API

The Podlet Client instance have the following API:

### .register(options)

Registers a podlet.

Example:

```js
const Client = require('@podium/podlet-client');
const client = new Client();

const component = client.register({uri: 'http://foo.site.com/manifest.json'});
```

Returns a Podium Resource Object.

#### options (required)

The following values can be provided:

 * `uri` Uri to the manifest of a podium component  - Required

### .js()

Retrieve list of all js references from all registered and fetched podlets.

```js
const Client = require('@podium/podlet-client');
const client = new Client();

const foo = client.register({uri: 'http://foo.site.com/manifest.json'});
const bar = client.register({uri: 'http://bar.site.com/manifest.json'});

await Promise.all([
    foo.fetch(),
    bar.fetch()
]);

client.js(); // Array of js entries
```

### .css()

Retrieve list of all css references from all registered and fetched podlets.

```js
const Client = require('@podium/podlet-client');
const client = new Client();

const foo = client.register({uri: 'http://foo.site.com/manifest.json'});
const bar = client.register({uri: 'http://bar.site.com/manifest.json'});

await Promise.all([
    foo.fetch(),
    bar.fetch()
]);

client.css(); // Array of css entries
```


## Podium Resource Object

A registered Podium component is stored in a Podium Resource Object.

The Podium Resource Object contain methods for retrieving the content of a
Podium component. The URI to the content of a component is defined in the
component's manifest. This is the content root of the component.

A Podium Resource Object has the following API:

### .fetch(options)

Fetches the content of the component. Returns a `Promise`.

#### options (optional)

An options object containing configuration. The following values can be provided:

 * pathname - {String} - A path which will be appended to the content root of the component when requested.
 * query - {Object} - An Object which will be appended as query parameters to the request to the component content.

### .stream(options)

Streams the content of the component. Returns a `ReadStream`.

#### options (optional)

An options object containing configuration. The following values can be provided:

 * pathname - {String} - A path which will be appended to the content root of the component when requested.
 * query - {Object} - An Object which will be appended as query parameters to the request to the component content.
