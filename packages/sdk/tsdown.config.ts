import { defineConfig } from 'tsdown';

export default defineConfig([
  // 1) npm package: ESM + CJS + types
  {
    entry: { index: 'src/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    target: 'es2019',
    platform: 'browser',
  },
  // 2) <script> tag bundle: exposes window.Web3Ads and auto-initialises
  {
    entry: { 'web3ads.min': 'src/browser.ts' },
    format: ['iife'],
    globalName: 'Web3Ads',
    minify: true,
    sourcemap: true,
    target: 'es2018',
    platform: 'browser',
    dts: false,
    clean: false,
    outputOptions: { entryFileNames: 'web3ads.min.js' },
  },
]);