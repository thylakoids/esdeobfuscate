esdeobfuscate = require('./esdeobfuscate.js')
recast = require('recast')

recast.run(function (ast) {

    debugger
    ast = esdeobfuscate.deobfuscate(ast.program);
    console.log(recast.print(ast).code)
})

