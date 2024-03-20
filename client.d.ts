import MetricsClient from '@metrics/client';
import { HttpIncoming, AssetJs, AssetCss } from '@podium/utils';
import { IncomingHttpHeaders, OutgoingHttpHeaders } from 'http';
import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';

declare class PodiumClient {
    constructor(options?: PodiumClient.PodiumClientOptions);

    readonly metrics: MetricsClient;
    readonly state:
        | 'instantiated'
        | 'initializing'
        | 'unstable'
        | 'stable'
        | 'unhealthy';

    register(
        options: PodiumClient.RegisterOptions,
    ): PodiumClient.PodiumClientResource;

    /**
     * Refreshes the manifests of all registered resources. Does so by calling the
     * `.refresh()` method on all resources under the hood.
     */
    refreshManifests(): Promise<void>;
    /**
     * This method will refresh a resource by reading its manifest and fallback
     * if defined in the manifest. The method will not call the URI to the content
     * of a component.
     */
    refresh(): Promise<number>;

    js(): Array<AssetJs>;
    css(): Array<AssetCss>;
    /**
     * @returns An array of all loaded manifests ready to be used by `.load()`
     */
    dump(): PodiumClient.PodletManifest[];
    /**
     * Loads an Array of manifests (provided by `.dump()`) into the proxy. If any of
     * the items in the loaded Array contains a key which is already in the cache, the
     * entry in the cache will be overwritten.
     *
     * If any of the entries in the loaded Array are not compatible with the format
     * which `.dump()` exports, they will not be inserted into the cache.
     *
     * @returns An Array with the keys which were inserted into the cache.
     */
    load(manifests: PodiumClient.PodletManifest[]): string[];
}

declare namespace PodiumClient {
    export type PodletManifest = {
        name: string;
        version: string;
        content: string;
        fallback?: string;
        proxy?: Record<string, string>;
        assets?: {
            js?: string[];
            css?: string[];
        };
        css?: string[];
        js?: string[];
    };

    type AbsLogger = {
        trace: LogFunction;
        debug: LogFunction;
        info: LogFunction;
        warn: LogFunction;
        error: LogFunction;
        fatal: LogFunction;
    };

    type LogFunction = (...args: any) => void;

    export type PodiumClientOptions = {
        name?: string;
        logger?: AbsLogger | Console;
        retries?: number;
        timeout?: number;
        maxAge?: number;
        rejectUnauthorized?: boolean;
        resolveThreshold?: number;
        resolveMax?: number;
        httpAgent?: HttpAgent;
        httpsAgent?: HttpsAgent;
    };
    export interface PodiumClientResourceOptions {
        pathname?: string;
        headers?: OutgoingHttpHeaders;
        query?: any;
    }

    export interface PodiumClientResponse {
        readonly redirect: PodiumRedirect;
        readonly content: string;
        readonly headers: IncomingHttpHeaders;
        readonly js: Array<AssetJs>;
        readonly css: Array<AssetCss>;
    }

    export class PodiumClientResource {
        readonly name: string;

        readonly uri: string;

        fetch(
            incoming: HttpIncoming,
            options?: PodiumClientResourceOptions,
        ): Promise<PodiumClientResponse>;

        stream(
            incoming: HttpIncoming,
            options?: PodiumClientResourceOptions,
        ): ReadableStream<PodiumClientResponse>;

        refresh(): Promise<boolean>;
    }

    export interface RegisterOptions {
        uri: string;
        name: string;
        retries?: number;
        timeout?: number;
        throwable?: boolean;
        redirectable?: boolean;
        resolveJs?: boolean;
        resolveCss?: boolean;
        includeBy?: RequestFilterOptions;
        excludeBy?: RequestFilterOptions;
    }
    export type RequestFilterOptions = {
        deviceType?: Array<string>;
    };

    export interface PodiumRedirect {
        readonly statusCode: number;
        readonly location: string;
    }
}

export default PodiumClient;
