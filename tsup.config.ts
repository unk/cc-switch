import { readFileSync } from 'node:fs';
import { defineConfig } from 'tsup';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node18',
  platform: 'node',
  clean: true,
  // Bundle deps so `npx @naram/cc-switch` works without a separate install step.
  noExternal: [/.*/],
  define: {
    'process.env.CC_SWITCH_VERSION': JSON.stringify(pkg.version),
  },
  banner: {
    js: '#!/usr/bin/env node',
  },
  outExtension() {
    return { js: '.js' };
  },
});
