'use strict';

const express = require('express');
const enableDestroy = require('server-destroy');

class FakeServer {
    constructor(manifest) {
        // Private
        this._app = express();
        this._server = undefined;

        this._routeManifest = '/manifest.json';
        this._routeContent = '/index.html';

        this._manifest = Object.assign(
            {
                content: this._routeContent,
                version: this.constructor.makeVersion(),
                name: 'component',
            },
            manifest
        );

        this._metrics = { manifest: 0, content: 0 };

        // Public
        Object.defineProperty(this, 'metrics', {
            get: () => this._metrics,
            set: () => {
                throw new Error('Cannot set read-only property.');
            },
        });

        Object.defineProperty(this, 'version', {
            get: () => this._manifest.version,
            set: value => {
                this._manifest.version = value;
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

        // Middleware
        this._app.use((req, res, next) => {
            res.setHeader('podlet-version', this._manifest.version);
            next();
        });

        // Manifest route
        this._app.get(this._routeManifest, (req, res) => {
            this._metrics.manifest++;
            res.status(200).json(this._manifest);
        });

        // Content route
        this._app.get(this._routeContent, (req, res) => {
            this._metrics.content++;
            res.status(200).send(`<p>${this._manifest.name}</p>`);
        });
    }

    listen() {
        return new Promise(resolve => {
            this._server = this._app.listen(0, 'localhost', () => {
                const address = `http://${this._server.address()
                    .address}:${this._server.address().port}`;
                const manifest = `${address}${this._routeManifest}`;
                const content = `${address}${this._routeContent}`;
                const options = {
                    uri: manifest,
                    name: this._manifest.name,
                };
                resolve({
                    manifest,
                    content,
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
