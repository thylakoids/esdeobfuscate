#! /usr/bin/env node

var DEBUGNAME = __filename.slice(__dirname.length + 1, -3);
var debug = require('util').debuglog(DEBUGNAME);

// const escope = require('escope')
const esprima = require("esprima");
const esmangle = require("esmangle");
const escodegen = require("escodegen");
const recast = require('recast')
const fs = require('fs')
const esdeobfuscate = require('./esdeobfuscate.js')

var code = function () {
    var filename;
    const argv = process.argv;
    if (argv.indexOf("-h") !== -1) {
        console.log();
        process.exit(1);
    }

    if (!argv[2])
        filename = "/dev/stdin";
    else
        filename = argv[2];
    try {
        var code = fs.readFileSync(filename);
        return code + ''
    } catch (exc) {
        console.error(exc);
        process.exit(1);
    }
}()

// var scopeManager = escope.analyze(ast);
// var currrentScope = scopeManager.acquire(ast);
var ast = esprima.parse(code)
try {
    ast = esdeobfuscate.deobfuscate(ast, {}, true);
} catch (e) {
    console.log(e)
    process.exit(1)
}

debug(`
AST:
${JSON.stringify(ast, null, 2)}
======================
SCOPES:
${JSON.stringify(esdeobfuscate.scope, null, 0)}`)

var newcode = recast.print(ast).code
console.log(newcode)
