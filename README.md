# podium-client

Client for fetching podium component fragments over http.


## Installation

```bash
$ npm i @podium/client --save
```


## Simple stream usage

Connect to a podium component server and stream the html content:

```js
const PodiumClient = require('@podium/client');
const client = new PodiumClient();

const component = client.register({uri: 'http://foo.site.com/manifest.json'});

const stream = component.stream();
stream.on('error', (error) => {
    console.log(error)
})
stream.pipe(process.stdout);
```

## Simple stream usage

Connect to a podium component server and fetch the html content:

```js
const PodiumClient = require('@podium/client');
const client = new PodiumClient();

const component = client.register({uri: 'http://foo.site.com/manifest.json'});

component.fetch().then((content) => {
    console.log(content);
}).catch((error) => {
    console.log(error);
});
```


## Constructor

Create a new Podium Client instance.

```js
const client = new PodiumClient(options);
```

### options (optional)

An Object containing configuration. The following values can be provided:

 * cacheSize - {Number} - Amount of podlet manifests the client should hold. Default: 20


## API

The Podium Client instance have the following API:

### .register(options)

Registers a podium component

#### options (required)

The following values can be provided:

 * `uri` Uri to the manifest of a podium component  - Required
