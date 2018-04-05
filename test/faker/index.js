'use strict';

const Context = require('@podium/context');
const express = require('express');
const EventEmitter = require('events');
const enableDestroy = require('server-destroy');

class FakeServer extends EventEmitter {
    constructor(manifest) {
        super();

        // Private
        this._app = express();
        this._server = undefined;
        this._context = new Context('faker');

        this._routeManifest = '/manifest.json';
        this._routeContent = '/index.html';
        this._routeFallback = '/fallback.html';
        this._routeError = '/error';

        this._headersManifest = {};
        this._headersContent = {};
        this._headersFallback = {};

        this._manifest = Object.assign(
            {
                content: this._routeContent,
                version: this.constructor.makeVersion(),
                name: 'component',
            },
            manifest
        );

        this._bodyManifest = this._manifest;
        this._bodyContent = `<p>content ${this._manifest.name}</p>`;
        this._bodyFallback = `<p>fallback ${this._manifest.name}</p>`;

        this._metrics = {
            manifest: 0,
            fallback: 0,
            content: 0,
            error: 0,
        };

        // Public
        Object.defineProperty(this, 'metrics', {
            get: () => this._metrics,
            set: () => {
                throw new Error('Cannot set read-only property.');
            },
        });

        Object.defineProperty(this, 'manifest', {
            get: () => this._manifest,
            set: () => {
                throw new Error('Cannot set read-only property.');
            },
            configurable: true,
            enumerable: true,
        });

        Object.defineProperty(this, 'version', {
            get: () => this._manifest.version,
            set: value => {
                this._manifest.version = value;
            },
            configurable: true,
            enumerable: true,
        });

        Object.defineProperty(this, 'content', {
            get: () => this._manifest.content,
            set: value => {
                this._manifest.content = value;
            },
            configurable: true,
            enumerable: true,
        });

        Object.defineProperty(this, 'fallback', {
            get: () => this._manifest.fallback,
            set: value => {
                this._manifest.fallback = value;
            },
            configurable: true,
            enumerable: true,
        });

        Object.defineProperty(this, 'assets', {
            get: () => this._manifest.assets,
            set: value => {
                if (!this._manifest.assets) {
                    this._manifest.assets = {};
                }
                Object.assign(this._manifest.assets, value);
            },
            configurable: true,
            enumerable: true,
        });

        Object.defineProperty(this, 'headersManifest', {
            get: () => this._headersManifest,
            set: value => {
                this._headersManifest = value;
            },
            configurable: true,
            enumerable: true,
        });

        Object.defineProperty(this, 'headersContent', {
            get: () => this._headersContent,
            set: value => {
                this._headersContent = value;
            },
            configurable: true,
            enumerable: true,
        });

        Object.defineProperty(this, 'headersFallback', {
            get: () => this._headersFallback,
            set: value => {
                this._headersFallback = value;
            },
            configurable: true,
            enumerable: true,
        });

        Object.defineProperty(this, 'manifestBody', {
            get: () => this._bodyManifest,
            set: value => {
                this._bodyManifest = value;
            },
            configurable: true,
            enumerable: true,
        });

        Object.defineProperty(this, 'contentBody', {
            get: () => this._bodyContent,
            set: value => {
                this._bodyContent = value;
            },
            configurable: true,
            enumerable: true,
        });

        Object.defineProperty(this, 'fallbackBody', {
            get: () => this._bodyFallback,
            set: value => {
                this._bodyFallback = value;
            },
            configurable: true,
            enumerable: true,
        });

        // Middleware
        this._app.use((req, res, next) => {
            res.setHeader('podlet-version', this._manifest.version);
            next();
        });

        this._app.use(this._context.middleware());

        // Manifest route
        this._app.get(this._routeManifest, (req, res) => {
            this._metrics.manifest++;
            Object.keys(this._headersManifest).forEach(key => {
                res.setHeader(key, this._headersManifest[key]);
            });
            this.emit('req:manifest', this._metrics.manifest, req);
            res.status(200).json(this._bodyManifest);
        });

        // Content route
        this._app.get(this._routeContent, (req, res) => {
            this._metrics.content++;
            Object.keys(this._headersContent).forEach(key => {
                res.setHeader(key, this._headersContent[key]);
            });
            this.emit('req:content', this._metrics.content, req);
            res.status(200).send(this._bodyContent);
        });

        // Fallback route
        this._app.get(this._routeFallback, (req, res) => {
            this._metrics.fallback++;
            Object.keys(this._headersFallback).forEach(key => {
                res.setHeader(key, this._headersFallback[key]);
            });
            this.emit('req:fallback', this._metrics.fallback, req);
            res.status(200).send(this._bodyFallback);
        });

        // Error route
        this._app.get(this._routeError, (req, res) => {
            this._metrics.error++;
            this.emit('req:error', this._metrics.error, req);
            res.status(500).send('Internal server error');
        });

        // 404 Not found status
        this._app.use((req, res) => {
            res.status(404).send('Not found');
        });

        // Express config
        this._app.disable('x-powered-by');
        this._app.disable('etag');
    }

    listen() {
        return new Promise(resolve => {
            this._server = this._app.listen(0, 'localhost', () => {
                const address = `http://${this._server.address().address}:${
                    this._server.address().port
                }`;
                const manifest = `${address}${this._routeManifest}`;
                const content = `${address}${this._routeContent}`;
                const error = `${address}${this._routeError}`;
                const options = {
                    uri: manifest,
                    name: this._manifest.name,
                };
                resolve({
                    manifest,
                    content,
                    error,
                    address,
                    options,
                });
            });

            enableDestroy(this._server);
        });
    }

    close() {
        if (this._server) {
            return new Promise((resolve, reject) => {
                this._server.destroy(err => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        }
        return Promise.resolve();
    }

    static makeVersion(index = 1) {
        return `1.0.0-beta.${index.toString()}`;
    }
}

module.exports = FakeServer;
