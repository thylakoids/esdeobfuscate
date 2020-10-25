/*
  Copyright (C) 2014 Igor null <m1el.2027@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

var DEBUGNAME = __filename.slice(__dirname.length + 1, -3);
var debug = require('util').debuglog(DEBUGNAME);

const esprima = require('esprima')
const recast = require('recast')

// const jsdom = require("jsdom");
// const {JSDOM} = jsdom;
// const dom = new JSDOM(`<!DOCTYPE html><p>Hello world</p>`);
// window = dom.window;
// document = window.document;
// XMLHttpRequest = window.XMLHttpRequest;

// delete window.navigator
// window.navigator = {
//     userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36",
//     platform: "Linux x86_64"
// };

// window.screenTop = 40
// window.screenLeft = 0
// window.outerWidth = 1707
// window.outerHeight = 920
// window.innerWidth = 310
// window.innerHeight = 816
// Object.defineProperty(window.screen, 'width', {get: function () {return 1706}})
// Object.defineProperty(window.screen, 'height', {get: function () {return 960}})
// Object.defineProperty(window.screen, 'availHeight', {get: function () {return 920}})
// Object.defineProperty(window.screen, 'availLeft', {get: function () {return 0}})
// Object.defineProperty(window.screen, 'availTop', {get: function () {return 40}})
// Object.defineProperty(window.screen, 'availWidth', {get: function () {return 1707}})
// Object.defineProperty(window.screen, 'colorDepth', {get: function () {return 24}})
// Object.defineProperty(window.screen, 'pixelDepth', {get: function () {return 24}})

// Object.defineProperty(window.document.documentElement, 'clientWidth', {get: function () {return 310}})
// Object.defineProperty(window.document.documentElement, 'clientHeight', {get: function () {return 816}})

// window.document.hasFocus = function () {return true}

var esdeobfuscate = (function () {
    var boperators = {
        '+': function (a, b) {return a + b;},
        '-': function (a, b) {return a - b;},
        '*': function (a, b) {return a * b;},
        '/': function (a, b) {return a / b;},
        '**': function (a, b) {return a ** b;},
        '%': function (a, b) {return a % b;},

        '<<': function (a, b) {return a << b;},
        '>>': function (a, b) {return a >> b;},
        '>>>': function (a, b) {return a >>> b;},

        '>': function (a, b) {return a > b;},
        '<': function (a, b) {return a < b;},
        '>=': function (a, b) {return a >= b;},
        '<=': function (a, b) {return a <= b;},
        '==': function (a, b) {return a == b;},
        '===': function (a, b) {return a === b;},
        '!=': function (a, b) {return a != b;},
        '!==': function (a, b) {return a !== b;},
        'in': function (a, b) {return a in b;},
        'instanceof': function (a, b) {return a instanceof b;},

        '||': function (a, b) {return a || b;},
        '&&': function (a, b) {return a && b;},
        '|': function (a, b) {return a | b;},
        '&': function (a, b) {return a & b;},
        '^': function (a, b) {return a ^ b;},

    };
    var uoperators = {
        '!': function (a) {return !a;},
        '~': function (a) {return ~a;},
        '+': function (a) {return +a;},
        '-': function (a) {return -a;},
        'void': function (a) {return void a;},
        'delete': function (a) {return delete a;},
        'typeof': function (a) {return typeof a;}
    };
    var aoperators = {
        '=': (a, b) => b,
        '-=': (a, b) => a - b,
        '+=': (a, b) => a + b,
        '*=': (a, b) => a * b,
        '/=': (a, b) => a / b,
        '%=': (a, b) => a % b,
        '**=': (a, b) => a ** b,
        '<<=': (a, b) => a << b,
        '>>=': (a, b) => a >> b,
        '>>>=': (a, b) => a >>> b,
        '&=': (a, b) => a & b,
        '^=': (a, b) => a ^ b,
        '|=': (a, b) => a | b,
    };
    var updateoperator = {
        '++': a => ++a,
        '--': a => --a,
    }

    function isSymbol(value) {
        if (typeof value === 'symbol' && /^@#nonepure\./.test(value.description)) {
            return true
        } else {
            return false
        }
    }

    function Symbol2ast(s) {
        s = /^@#nonepure\.(.*)$/.exec(s.description)[1]
        if (s) {
            return esprima.parse(s).body[0].expression
        }
    }
    function ast2Symbol(ast) {
        return Symbol('@#nonepure.' + recast.print(ast).code)
    }

    function expandast(ast) {
        if (ast.pure) {
            if (!ast.value || ast.value.toString().length < 100) {
                return mkliteral(ast.value);
            }
        }
        if (isSymbol(ast.value)) {
            return Symbol2ast(ast.value)
        }
        return ast
    }

    function mkupdateExp(id, value, retvalue) {
        return {
            pure: true,
            value: retvalue,
            type: 'SequenceExpression',
            expressions: [
                {
                    type: 'AssignmentExpression',
                    operator: '=',
                    left: {type: 'Identifier', name: id},
                    right: mkliteral(value)
                },
                mkliteral(retvalue)
            ]
        }
    }

    function match(o, pattern) {
        return Object.keys(pattern).every(function (k) {
            if (typeof pattern[k] !== 'object') {
                return o && pattern[k] === o[k];
            } else {
                return o && match(o[k], pattern[k]);
            }
        });
    }

    function mkliteral(value, raw) {
        // 6种基本数据类型:undefined, null, boolean, number, string, symbol
        // object:Object, Array, Date, RegExp, Function
        debug('mkliteral(value):', value)
        try {
            if (value === undefined) {
                return {
                    type: 'Identifier',
                    name: 'undefined',
                    pure: true,
                    value: value
                };
            }
            if (value === null) {
                return {
                    type: 'Identifier',
                    name: 'null',
                    pure: true,
                    value: value
                };
            }
            if (typeof value === 'number') {
                if (isNaN(value)) {
                    return {
                        type: 'Identifier',
                        name: 'NaN',
                        pure: true,
                        value: value
                    };
                }
                if (value < 0) {
                    return {
                        type: 'UnaryExpression',
                        operator: '-',
                        value: value,
                        pure: true,
                        argument: {
                            type: 'Literal',
                            pure: true,
                            value: -value,
                            raw: JSON.stringify(-value)
                        }
                    }
                }
            }
            if (typeof value === 'symbol') {
                return {
                    type: 'CallExpression',
                    callee: {
                        type: 'Identifier',
                        name: 'Symbol'
                    },
                    arguments: [
                        {
                            type: 'Literal',
                            value: value.description,
                            raw: value.description
                        }
                    ]
                }
            }
            if (typeof value === 'function') {
                return {
                    type: 'Identifier',
                    name: value.name === 'anonymous' ? `(${value.toString()})` : value.name,
                    pure: true,
                    value: value
                }
            }
            if (value instanceof Array) {
                // todo, empty value
                // a = []
                // a[10] = -10
                return {
                    type: 'ArrayExpression',
                    elements: value.map(x => mkliteral(x)),
                    pure: true,
                    value: value
                }
            }
            if (typeof value === 'object') {
                //todo
                ret = {
                    type: 'Identifier',
                    pure: true,
                    value: value
                }
                if (value === console) {
                    ret.name = 'console'
                } else {
                    if (/\[object (\w+?)\]/.test(value.toString())) {
                        ret.name = /\[object (\w+?)\]/.exec(value.toString())[1]
                    } else {
                        ret.name = raw ? raw : '$object'
                    }
                }
                if (ret.name === 'Object') {ret.name = raw ? raw : JSON.stringify(value)}
                return ret
            }

            //default:string, boolean, number(+), RegExp
            return {
                type: 'Literal',
                pure: true,
                value: value,
                raw: JSON.stringify(value)
            }
        }
        catch (e) {
            debugger
            console.log(e)
            process.exit(1)
        }
    }

    function pureValue(ast) {
        // if a node is pure, return its value. 
        // if it is a Identifier then check scope.
        var ret = {pure: false, value: undefined, scope: null, scopevar: false, name: null}
        ret.value = ast.value
        ret.pure = ast.pure ? true : false
        if (ast.type === 'Identifier') {
            Object.keys(scopes).map(function (k) {
                if (Object.keys(scopes[k]).indexOf(ast.name) !== -1) {
                    ret = {
                        pure: scopes[k][ast.name].pure,
                        value: scopes[k][ast.name].value,
                        scope: scopes[k],
                        scopevar: true,
                        name: ast.name,
                    }
                }
            })
        }
        return ret
    }

    function getGscope(vars) {
        let gscope = {}
        vars.map(function (k) {
            gscope[k] = {pure: true, value: global[k]}
        })
        return gscope
    }

    // const global_vars = ["console", "window", "document", "String", "Object", "Array", "eval",
    //     "Number", "Boolean", "RegExp", "JSON", "escape", "unescape",
    //     "decodeURIComponent", "encodeURI", "encodeURIComponent",
    //     "Date", "Error", "EvalError", "Function", "Infinity",
    //     "Math", "NaN", "RangeError", "ReferenceError",
    //     "SyntaxError", "TypeError", "URIError", "decodeURI",
    //     "isFinite", "isNaN", "parseFloat", "parseInt", "undefined", "null",
    //     "ArrayBuffer", "Buffer", "Float32Array", "Float64Array",
    //     "Int16Array", "Int32Array", "Int8Array", "Uint16Array",
    //     "Uint32Array", "Uint8Array", "Uint8ClampedArray",
    //     "clearImmediate", "clearInterval", "clearTimeout",
    //     "setImmediate", "setInterval", "setTimeout", "atob", "btoa"
    // ];
    const global_vars = ["console", "JSON", "Date", "Math",
        "String", "Object", "Array", "Number", "Boolean", "RegExp", "Symbol", 'Function',
        "eval", "isNaN", "parseInt",
        "NaN", 'undefined', 'null'
    ]

    var scopes = {
        gscope: getGscope(global_vars),
        scope: {},
    }
    function const_collapse(ast, scope, expandvars) {
        try {
            scope = scope || {}
            expandvars = expandvars && true;
            if (!ast) return ast;
            var const_collapse_scoped = function (e) {
                return const_collapse(e, scope, expandvars);
            };
            var ret, left, right, arg, name, value, fscope, last, pure, purenode, pureobject, pureproperty;
            scopes.scope = scope

            switch (ast.type) {
                case 'LogicalExpression':
                case 'BinaryExpression':
                    ret = {
                        left: const_collapse_scoped(ast.left),
                        right: const_collapse_scoped(ast.right),
                        type: ast.type,
                        operator: ast.operator
                    }
                    if (ret.left.pure && ret.right.pure && ret.operator in boperators) {
                        ret.value = boperators[ret.operator](ret.left.value, ret.right.value);
                        ret.pure = true;
                    } else {
                        ret.pure = false;
                    }
                    return expandvars ? expandast(ret) : ret
                case 'UnaryExpression':
                    arg = const_collapse_scoped(ast.argument);
                    if (arg.pure && ast.operator in uoperators) {
                        return mkliteral(uoperators[ast.operator](arg.value));
                    } else {
                        return {
                            type: ast.type,
                            operator: ast.operator,
                            argument: arg,
                            prefix: ast.prefix
                        };
                    }
                case 'Program':
                    ret = {
                        type: ast.type,
                        body: ast.body.map(const_collapse_scoped)
                    };
                    return ret;
                case 'ExpressionStatement':
                    ret = {
                        type: ast.type,
                        expression: const_collapse_scoped(ast.expression)
                    };
                    ret.pure = ret.expression.pure;
                    return ret;
                case 'AssignmentExpression':
                    ret = {
                        type: ast.type,
                        operator: ast.operator,
                        left: const_collapse(ast.left, scope, false),
                        right: const_collapse_scoped(ast.right)
                    };
                    // a+=b ---- a=a+b
                    // ? 有什么情况会出错吗？
                    if (ret.operator !== '=' && Object.keys(aoperators).indexOf(ret.operator) !== -1) {
                        ret.right = const_collapse_scoped({
                            type: 'BinaryExpression',
                            operator: ret.operator.split('=')[0],
                            left: ret.left,
                            right: ret.right
                        })
                        ret.operator = '=';
                    }

                    if (ret.left.type === 'Identifier') {
                        // '=': add left to scope
                        // '+=,-=,...' and right is in scope: update scope
                        ret.pure = ret.right.pure
                        ret.value = ret.pure ? ret.right.value : ret.right.value ? ret.right.value : ast2Symbol(ret.right)
                        scope[ret.left.name] = {
                            value: ret.value,
                            pure: ret.pure,
                        }
                    }
                    //a[10] = 10
                    //a.b = 10
                    if (match(ret.left, {
                        type: 'MemberExpression',
                        object: {type: 'Identifier'}
                    })) {
                        pureobject = pureValue(ret.left.object)
                        if (ret.left.computed) {
                            pureproperty = pureValue(ret.left.property)
                        } else {
                            pureproperty = {pure: true, value: ret.left.property.name}
                        }
                        if (pureobject.value && pureproperty.pure && typeof pureobject.value === 'object') {
                            ret.value = ret.right.value
                            ret.pure = ret.right.pure
                            pureobject.value[pureproperty.value] = ret.value
                        }
                    }
                    return ret;
                case 'CallExpression':
                    ret = {
                        type: 'CallExpression',
                        callee: const_collapse_scoped(ast.callee),
                        arguments: ast.arguments.map(const_collapse_scoped)
                    };
                    ret.purecallee = pureValue(ret.callee)
                    ret.purearg = ret.arguments.every(function (e) {
                        return e.pure;
                    });

                    //eval
                    if (match(ret.callee, {
                        type: 'Identifier',
                        name: 'eval',
                    }) && match(ret.arguments[0], {
                        type: 'Literal'
                    })) {
                        if (ret.arguments[0].value === "") {return mkliteral(undefined)}
                        return const_collapse_scoped(esprima.parse(ret.arguments[0].value).body[0].expression)
                    }

                    if (ret.purecallee.pure && ret.purearg) {
                        //这里是不执行的函数console.log
                        if ([console.log].indexOf(ret.purecallee.value) !== -1) {
                            return ret
                        }

                        // 需要this的函数，String 和Array的方法.
                        // 这里调用函数很可能会改变this的值
                        // 这里参数传递都是引用， 如果不是会出错。这里的函数的this都必须是Object，保证参数传递是引用.
                        if (match(ret.callee, {
                            type: 'MemberExpression',
                            property: {type: 'Identifier'}
                        })) {
                            pureobject = pureValue(ret.callee.object)
                            value = pureobject.value[ret.callee.property.name].apply(
                                pureobject.value,
                                ret.arguments.map(x => x.value)
                            )
                            ret.value = value
                            ret.pure = true
                            return mkliteral(value)
                        }

                        //default
                        //? 函数会改变参数的值的情况怎么处理
                        try {
                            value = ret.purecallee.value.apply(ret.value,
                                ret.arguments.map(x => x.value)
                            )
                            ret.value = value
                            ret.pure = true
                            return mkliteral(value)
                        } catch (e) {
                            console.log('ast:', recast.print(ast).code)
                            console.log('ret:', recast.print(ret).code)
                            console.log('error when try to execute function', e.message)
                            return ret
                        }
                    }

                    if (ret.purecallee.pure && !ret.purearg) {
                        if (match(ret.callee, {
                            type: 'MemberExpression',
                            property: {type: 'Identifier'}
                        })) {
                            function findcallthis(ast) {
                                if (ast.callee && ast.callee.object && match(ast.callee.object, {
                                    type: 'CallExpression',
                                    callee: {type: 'MemberExpression'}
                                })) {
                                    return findcallthis(ast.callee.object)
                                } else {
                                    return ast.callee.object ? ast.callee.object : ast
                                }
                            }
                            let callthis = findcallthis(ast)
                            purenode = pureValue(callthis)
                            if (purenode.scopevar) {
                                purenode.scope[purenode.name].pure = false
                                purenode.scope[purenode.name].value = undefined
                            }
                            // 这里有可能让object的pure变成false.
                            // pureobject = pureValue(ret.callee.object)
                            // pureobject.value = Symbol.for('nonepure')
                        }
                    }
                    //?
                    if (ret.callee.body && ret.callee.body.pure) {
                        return mkliteral(ret.callee.body.value);
                    }

                    return ret;
                case 'Literal':
                    return mkliteral(ast.value, ast.raw);
                case 'Identifier':
                    purenode = pureValue(ast)
                    ast.pure = purenode.pure
                    ast.value = purenode.scopevar ? purenode.value : ast2Symbol(ast)
                    return expandvars ? expandast(ast) : ast
                case 'ArrayExpression':
                    ret = {
                        type: ast.type,
                        elements: ast.elements.map(const_collapse_scoped)
                    };
                    ret.pure = ret.elements.every(x => x.pure)
                    ret.value = ret.elements.length ? ret.elements.map(x => x.pure ? x.value : x.value ? x.value : ast2Symbol(x)) : []
                    return ret;
                case 'ObjectExpression':
                    ret = {
                        type: ast.type,
                        properties: ast.properties.map(function (p) {
                            return {
                                type: p.type,
                                key: p.key,
                                value: const_collapse_scoped(p.value)
                            };
                        })
                    };
                    ret.pure = ret.properties.every(x => x.value.pure)
                    ret.value = {}
                    if (ret.properties.length) {
                        ret.properties.map(function (p) {
                            ret.value[p.key.name] = p.value.pure ? p.value.value : p.value.value ? p.value.value : ast2Symbol(p.value)
                        })
                    }
                    return ret

                case 'MemberExpression':
                    ret = {
                        type: ast.type,
                        computed: ast.computed,
                        object: const_collapse_scoped(ast.object),
                        // do not expand identifiers as variables if they are not in square brackets
                        property: ast.computed
                            ? const_collapse_scoped(ast.property)
                            : const_collapse(ast.property, scope, false)
                    }
                    // replace ['property'] with .property accessor
                    if (ret.computed && ret.property.pure && /^[a-z_$][a-z_$0-9]*$/i.test('' + ret.property.value)) {
                        ret.computed = false;
                        ret.property = {
                            type: 'Identifier',
                            name: ret.property.value
                        };
                    }
                    pureobject = pureValue(ret.object)
                    // a.property
                    // a[1]
                    // a[[]]
                    if (pureobject.value) {
                        ret.value = isSymbol(pureobject.value) ? ast2Symbol(ret) : pureobject.value[ret.property.name ? ret.property.name : ret.property.value]
                        ret.pure = isSymbol(ret.value) ? false : true
                    }
                    if(ret.property.name === 'length'&&expandvars){
                        return expandast(ret)
                    }
                    // 一般不要展开, 如console.log
                    return ret
                case 'VariableDeclaration':
                    ret = {
                        type: ast.type,
                        kind: ast.kind,
                        declarations: ast.declarations.map(const_collapse_scoped)
                    };
                    ret.pure = ret.declarations.every(function (e) {
                        return !e.init || e.init.pure;
                    });
                    return ret;
                case 'VariableDeclarator':
                    ret = {
                        type: ast.type,
                        id: ast.id,
                        init: const_collapse_scoped(ast.init)
                    };
                    if (ret.init && ret.init.pure) {
                        scope[ast.id.name] = {
                            value: ret.init.value,
                            pure: true
                        };
                    } else {
                        scope[ast.id.name] = {
                            value: undefined,
                            pure: false
                        }
                    }
                    return ret;
                case 'FunctionDeclaration':
                    fscope = Object.create(scope);
                    ast.params.map(function (p) {
                        fscope[p.name] = {value: undefined, pure: false};
                    });
                    if (ast.id) {
                        scope[ast.id] = {value: undefined, pure: false};
                    }
                    return {
                        type: ast.type,
                        id: ast.id,
                        params: ast.params,
                        body: const_collapse(ast.body, fscope, true),
                        test: ast.test,
                        generator: ast.generator,
                        expression: ast.expression
                    };
                case 'FunctionExpression':
                    fscope = Object.create(scope);
                    ast.params.map(function (p) {
                        fscope[p.name] = {value: undefined, pure: false};
                    });
                    if (ast.id) {
                        fscope[ast.id] = {value: undefined, pure: false};
                    }
                    return {
                        type: ast.type,
                        id: ast.id,
                        params: ast.params,
                        defaults: ast.defaults,
                        body: const_collapse(ast.body, fscope, true),
                        test: ast.test,
                        generator: ast.generator,
                        expression: ast.expression
                    };
                case 'BlockStatement':
                    ret = {
                        type: ast.type,
                        body: ast.body.map(const_collapse_scoped)
                    };
                    last = ret.body && ret.body.length > 0 && ret.body[ret.body.length - 1];
                    pure = ret.body && ret.body.every(function (e) {
                        return e.pure;
                    });
                    if (pure && last && last.type === 'ReturnStatement' && last.argument && last.argument.pure) {
                        return {
                            type: ast.type,
                            pure: true,
                            value: last.argument.value,
                            body: [last]
                        }
                    } else {
                        ret.pure = ret.body.every(function (e) {
                            return e.pure;
                        });
                        return ret;
                    }
                case 'ReturnStatement':
                    ret = {
                        type: ast.type,
                        argument: const_collapse(ast.argument, scope, true)
                    };
                    ret.pure = ret.argument && ret.argument.pure;
                    return ret;
                case 'IfStatement':
                    ret = {
                        type: ast.type,
                        test: const_collapse_scoped(ast.test),
                        consequent: const_collapse_scoped(ast.consequent),
                        alternate: const_collapse_scoped(ast.alternate)
                    };
                    if (ret.test.pure) {
                        if (ret.test.value && ret.consequent.pure) {
                            return ret.consequent;
                        }
                        if (!ret.test.value && ret.alternate.pure) {
                            return ret.alternate || {type: 'BlockStatement', body: []};
                        }
                    }
                    return ret;
                case 'DoWhileStatement':
                case 'WhileStatement':
                    return {
                        type: ast.type,
                        test: const_collapse_scoped(ast.test),
                        body: const_collapse_scoped(ast.body)
                    };
                case 'ForStatement':
                    return {
                        type: ast.type,
                        init: const_collapse_scoped(ast.init),
                        test: const_collapse_scoped(ast.test),
                        update: const_collapse_scoped(ast.update),
                        body: const_collapse_scoped(ast.body)
                    };
                case 'ForInStatement':
                    return {
                        type: ast.type,
                        left: ast.left,
                        right: const_collapse_scoped(ast.right),
                        body: const_collapse_scoped(ast.body)
                    };
                case 'BreakStatement':
                case 'ContinueStatement':
                    return {
                        type: ast.type,
                        label: ast.label
                    };
                case 'EmptyStatement':
                case 'ThisExpression':
                    return {type: ast.type};
                case 'ConditionalExpression':
                    ret = {
                        type: ast.type,
                        test: const_collapse_scoped(ast.test),
                        consequent: const_collapse_scoped(ast.consequent),
                        alternate: const_collapse_scoped(ast.alternate)
                    };
                    if (ret.test.pure) {
                        if (ret.test.value && ret.consequent.pure) {
                            return mkliteral(ret.consequent.value);
                        }
                        if (!ret.test.value && ret.alternate.pure) {
                            return mkliteral(ret.alternate.value);
                        }
                    }
                    return ret;
                case 'NewExpression':
                    ret = {
                        type: ast.type,
                        callee: const_collapse_scoped(ast.callee),
                        arguments: ast.arguments.map(const_collapse_scoped)
                    };
                    ret.purearg = ret.arguments.every(function (e) {
                        return e.pure;
                    });
                    ret.purecallee = pureValue(ret.callee);
                    if (ret.purecallee.pure && ret.purearg) {
                        ret.pure = true
                        ret.value = new (Function.prototype.bind.apply(ret.callee.value,
                            [null].concat(ret.arguments.map(x => x.value))))
                    }
                    return ret
                case 'SequenceExpression':
                    ret = {
                        type: ast.type,
                        expressions: ast.expressions.map(const_collapse_scoped)
                    };
                    ret.pure = ret.expressions.slice(-1)[0].pure
                    ret.value = ret.expressions.slice(-1)[0].value
                    return ret
                case 'UpdateExpression':
                    ret = {
                        type: ast.type,
                        operator: ast.operator,
                        argument: const_collapse(ast.argument, scope, false),
                        prefix: ast.prefix
                    };
                    ret.purearg = pureValue(ret.argument)
                    if (ret.argument.type == 'Identifier' && ret.purearg.pure) {
                        svalue = +ret.purearg.value
                        value = updateoperator[ast.operator](svalue)
                        ret.purearg.scope[ret.purearg.name].value = value
                        ret.pure = true
                        if (ret.prefix) {
                            ret.value = value
                        } else {
                            ret.value = svalue
                        }
                        return mkupdateExp(ret.purearg.name, value, ret.value)
                    }
                    return ret
                case 'TryStatement':
                    return {
                        type: ast.type,
                        block: const_collapse_scoped(ast.block),
                        // guardedHandlers: ast.guardedHandlers.map(const_collapse_scoped),
                        handler: const_collapse_scoped(ast.handler),
                        finalizer: const_collapse_scoped(ast.finalizer),
                    };
                case 'CatchClause':
                    return {
                        type: ast.type,
                        param: ast.param,
                        body: const_collapse_scoped(ast.body)
                    };
                case 'ThrowStatement':
                    return {
                        type: ast.type,
                        argument: const_collapse_scoped(ast.argument)
                    };
                case 'LabeledStatement':
                    return {
                        type: ast.type,
                        label: ast.label,
                        body: const_collapse_scoped(ast.body)
                    };
                default:
                    console.log('unknown expression type: ' + ast.type);
                    return ast;
            }
        } catch (e) {
            console.log('start:', ast.loc.start)
            console.log('ast:', recast.print(ast).code)
            console.log('ret:', recast.print(ret).code)
            debugger
            console.log(e)
            process.exit(1)
        }
    }
    return {
        deobfuscate: const_collapse,
        scopes: scopes
    };
})();
module.exports = esdeobfuscate
