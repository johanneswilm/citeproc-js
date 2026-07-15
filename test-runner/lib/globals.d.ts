/**
 * Ambient declarations for the test runner.
 *
 * The test runner is a CommonJS program that depends on a number of packages
 * (and on Node's built-ins) whose type definitions are not installed in this
 * repository.  They are declared here as ``any`` so the runner's ``.ts``
 * sources type-check without a full ``node_modules`` install.
 */

// Node/CommonJS runtime globals
declare var require: any;
declare var module: any;
declare var exports: any;
declare var process: any;
declare var __dirname: string;
declare var __filename: string;
declare var global: any;
declare var Buffer: any;
declare var console: any;
declare function setTimeout(callback: any, ms?: number, ...args: any[]): any;
declare function clearTimeout(handle?: any): void;
declare function setInterval(callback: any, ms?: number, ...args: any[]): any;
declare function clearInterval(handle?: any): void;

// Node built-in modules
declare module "fs";
declare module "path";
declare module "os";
declare module "child_process";

// Third-party dependencies
declare module "chai";
declare module "chokidar";
declare module "citeproc";
declare module "citeproc-abbrevs";
declare module "citeproc-csl-schemata";
declare module "citeproc-juris-modules";
declare module "citeproc-locales";
declare module "cross-clear";
declare module "fetch-promise";
declare module "getopts";
declare module "normalize-newline";
declare module "tmp";
declare module "yaml";
declare module "zotero-to-csl";
declare module "zotero2jurismcsl";
