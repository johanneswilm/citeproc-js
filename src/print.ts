import { CSL } from './csl';

CSL.debug = function (str: string): void {
    console.log("CSL: " + str);
};
CSL.error = function (str: string): void {
    console.log("CSL error: " + str);
};
