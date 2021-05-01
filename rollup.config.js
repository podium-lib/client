export default {
    input: 'lib/client.js',
    external: [
        'http-cache-semantics',
        'lodash.clonedeep',
        '@podium/schemas',
        '@metrics/client',
        'readable-stream',
        'ttl-mem-cache',
        '@podium/utils',
        '@hapi/boom',
        'request',
        'events',
        'abslog',
        'assert',
        'https',
        'http',
        'path',
        'url',
        'fs',
    ],
    output: [
        {
            exports: 'auto',
            format: 'cjs',
            dir: 'dist/',
            preserveModules: true,
        }
    ],
};
