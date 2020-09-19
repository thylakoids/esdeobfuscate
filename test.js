const esdeobfuscate = require('./esdeobfuscate.js')
// const escope = require('escope')

recast = require('recast')


recast.run(function (ast) {

    // var scopeManager = escope.analyze(ast);
    // var currrentScope = scopeManager.acquire(ast);
    var ast = esdeobfuscate.deobfuscate(ast.program, {}, true);

    console.log(recast.print(ast).code)
})

