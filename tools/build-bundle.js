#!/usr/bin/env node
/*
 * Build citeproc.js (browser/IIFE) and citeproc_commonjs.js (CommonJS) bundles
 * from the modular TypeScript entry point ``src/index.ts`` using esbuild.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const ENTRY = path.join(ROOT, 'src', 'index.ts');

// Reuse the license/header preamble that precedes the code in the existing
// browser bundle so the generated files keep the same header.
function getHeader() {
    const existing = path.join(ROOT, 'citeproc.js');
    if (fs.existsSync(existing)) {
        return fs.readFileSync(existing, 'utf8')
            .split('/*global CSL: true */')[0]
            .replace(/\s+$/, '');
    }
    return '';
}

async function build() {
    const header = getHeader();

    // CommonJS bundle: ``require('citeproc')`` returns the CSL namespace.
    await esbuild.build({
        entryPoints: [ENTRY],
        bundle: true,
        platform: 'node',
        format: 'cjs',
        target: 'node14',
        outfile: path.join(ROOT, 'citeproc_commonjs.js'),
        banner: { js: header },
        logLevel: 'info'
    });

    // Browser bundle: exposes ``CSL`` as a global.
    await esbuild.build({
        entryPoints: [ENTRY],
        bundle: true,
        platform: 'browser',
        format: 'iife',
        globalName: 'CSL',
        target: 'es2018',
        outfile: path.join(ROOT, 'citeproc.js'),
        banner: { js: header },
        logLevel: 'info'
    });

    process.stdout.write('Built citeproc.js and citeproc_commonjs.js\n');
}

build().catch((err) => {
    console.error(err);
    process.exit(1);
});
