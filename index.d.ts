import { HttpIncoming, AssetJs, AssetCss } from '@podium/utils';
import { IncomingHttpHeaders, OutgoingHttpHeaders } from 'http';

declare interface PodiumClientResourceOptions {
    pathname?: string;
    headers?: OutgoingHttpHeaders;
    query?: any;
}

declare interface PodiumClientResponse {
    readonly content: string;
    readonly headers: IncomingHttpHeaders;
    readonly js: Array<AssetJs>;
    readonly css: Array<AssetCss>;
}

declare class PodiumClientResource {
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

declare interface RegisterOptions {
    uri: string;
    name: string;
    retries?: number;
    timeout?: number;
    throwable?: boolean;
    redirectable?: boolean;
    resolveJs?: boolean;
    resolveCss?: boolean;
}

export default class PodiumClient {
    readonly state:
        | 'instantiated'
        | 'initializing'
        | 'unstable'
        | 'stable'
        | 'unhealthy';

    register(options: RegisterOptions): PodiumClientResource;

    refreshManifests(): void;
}
