# ESDeobfuscate

ESDeobfuscate is a PoC JavaScriopt AST deobfuscator based on partial evaluation.

Constant expressions and functions that return constant values are replaced with corresponding values.

License = BSD.

## Usage

ESDeobfuscate works with Syntax Trees provided by [esprima](https://github.com/ariya/esprima)

    ast = esdeobfuscate.deobfuscate(ast);

## Demo

[m1el.github.io/esdeobfuscate](http://m1el.github.io/esdeobfuscate/)

## Development

Always add `pure` and `value` property to a processed ast node.

### One scope

