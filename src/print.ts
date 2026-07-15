/*global CSL: true */

if ("undefined" === typeof console) {
    CSL.debug = function (str: string): void {
        dump("CSL: " + str + "\n");
    };
    CSL.error = function (str: string): void {
        dump("CSL error: " + str + "\n");
    };
} else {
    CSL.debug = function (str: string): void {
        console.log("CSL: " + str);
    };
    CSL.error = function (str: string): void {
        console.log("CSL error: " + str);
    };
}
