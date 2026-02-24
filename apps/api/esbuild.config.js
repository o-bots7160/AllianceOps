import { build } from 'esbuild';

await build({
    entryPoints: ['src/index.ts'],
    bundle: true,
    outfile: 'dist/index.js',
    platform: 'node',
    target: 'node20',
    format: 'esm',
    sourcemap: true,
    // These packages must stay external:
    // - @azure/functions: registers functions with the Azure runtime at import time
    // - @prisma/client: uses dynamic requires for native query engine binaries
    // - applicationinsights: uses native OpenTelemetry instrumentation hooks
    external: ['@azure/functions', '@prisma/client', 'applicationinsights'],
    // Inline banner to keep "type": "module" semantics working
    banner: {
        js: [
            '// Bundled by esbuild — @allianceops/shared and dotenv are inlined',
            'import { createRequire } from "module";',
            'const require = createRequire(import.meta.url);',
        ].join('\n'),
    },
});
