#! /usr/bin/env node

var DEBUGNAME = __filename.slice(__dirname.length + 1, -3);
var debug = require('util').debuglog(DEBUGNAME);

// const escope = require('escope')
const esprima = require("esprima");
const recast = require('recast')
const esmangle = require("esmangle");
const escodegen = require("escodegen");
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

var ast = esprima.parse(code, {loc:true})
try {
    ast = esdeobfuscate.deobfuscate(ast, {'U6F':{pure:true,value:
(function anonymous(
) {
var a=arguments;return this[a[1]]!==a[0]
})
    }}, true);
} catch (e) {
    console.log(e)
    process.exit(1)
}

// debug(`
// ======================
// AST:
// ${ast}
// ----------------------
// SCOPES:
// ${p.pp(esdeobfuscate.scopes.scope)}
// ======================
// `)
debug(ast, '\n----------\nSCOPE:', esdeobfuscate.scopes.scope, '\n----------')

// ast = esmangle.optimize(ast)
var newcode = recast.print(ast).code
console.log(newcode)

