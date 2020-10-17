# ESDeobfuscate

ESDeobfuscate is a PoC JavaScript AST deobfuscator based on partial evaluation.

Constant expressions and functions that return constant values are replaced with corresponding values.

License = BSD.

## Usage

ESDeobfuscate works with Syntax Trees provided by [esprima](https://github.com/ariya/esprima)

    ast = esdeobfuscate.deobfuscate(ast);

## Demo

[m1el.github.io/esdeobfuscate](http://m1el.github.io/esdeobfuscate/)

## Development

* Only one scope.

* Take care of 2 things when processing an ast node.

    1. Is this node pure? if pure add pure and value property.
    2. Update scope.
    3. Expandvars?

### JS Basics

#### 基本数据类型

JavaScript 中共有6中基本数据类型: ·`undefined`, `null`, `boolean`, `number`,
`string`, `symbol`(new in ES6)

用`typeOf` 来判断基本数据类型

#### 引用类型

统称`object`, 细分的化有:`Object`, `Array`, `Date`, `RegExp`, `Function`

### CallExpression
```js
eval('a = 10')
a = [10, 20, 30];
a.push(-1);
a.shift();
a.unshift(90);
b = a.pop();
c = ['d', 'i', 'v'];
d = a.slice(-1)
e = (10, 11)
console.log(a, b, c.reverse().join(''), c, d, a.length, e)
```
deobfuscate
```js
a = 10;
a = [10, 20, 30];
a = [10, 20, 30, -1], 4;
a = [20, 30, -1], 10;
a = [90, 20, 30, -1], 4;
b = (a = [90, 20, 30], -1);
c = ["d", "i", "v"];
d = [30];
e = (10, 11);
console.log([90, 20, 30], -1, "vid", ["v", "i", "d"], [30], 3, 11);
```

## todo

1. add ref to none pure var.

## issue

1. [].push(b)

```js
a = []
a.push(b)
```

