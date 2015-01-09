(function (window) {

    RegExp.quote = function (str) {
        return (str + '').replace(/[.?*+^$[\]\\(){}|-]/g, "\\$&");
    };

    var parser = {
        equalSymbol : '::=',
        nonTerminals: ['|'],
        split       : function (str, symbols) {
            if (!str) {
                return false;
            }
            str = str.split(this.equalSymbol);

            var symbol = str[0],
                expr = str[1];

            if (symbols.indexOf(symbol) >= 0) {
                return {
                    symbol    : symbol,
                    expression: expr
                }
            } else {
                alert('BAD expression');
            }
        }
    };

    function objSize(obj) {
        var length = 0;
        for (var i in obj) length++;
        return length;
    }

    function grammaToMap(gramma, symbols) {
        var grammaMap = {},
            length = gramma.length,
            chunk;

        while (length--) {
            chunk = gramma[length];
            chunk = parser.split(chunk, symbols);
            grammaMap[chunk.symbol] = chunk;
        }

        return grammaMap;
    }

    function detectSymbols(chunk, symbols) {
        var detected = [];
        _.forEachRight(symbols, function (symbol) {
            if (chunk.expression.indexOf(symbol) >= 0) {
                detected.push(symbol);
            }
        });
        return detected;
    }

    function detectRepetitions(chunk) {
        var parsed = chunk.expression.split(''),
            length = parsed.length,
            it = 0,
            lastSymbols = parsed[it++],
            repetitions = 0,
            newExpression = [];

        for (it; it < length; it++) {
            var equal = parsed[it] === lastSymbols;

            if (equal) {
                repetitions++;
            }

            // not working :/

            if (!equal || it === length - 1) {
                newExpression.push(lastSymbols + '{' + (repetitions + 1) + '}');

                lastSymbols = it !== length - 1 ? parsed[it + 1] : undefined;

                if (!lastSymbols) {
                    break;
                } else {
                    newExpression.push(parsed[it]);
                    repetitions = 0;
                    it++;
                }
            }
        }
        chunk.expression = newExpression.join('');
        return chunk;
    }

    function hasTerminalsOnly(chunk, symbols) {
        var expression = chunk.expression,
            parsed = expression.split(''),
            onlyTerminals = true,
            rejects = _.filter(symbols, function (symbol) {
                return parsed.indexOf(symbol) >= 0;
            });

        if (rejects.length) {
            return onlyTerminals = false;
        }

        return onlyTerminals;
    }

    window.TT = {
        toRegexp: function (gramma, symbols) {
            console.log('TT > gramma=[' + gramma + '] and symbols=[' + symbols + ']');
            if (!gramma) {
                return false;
            }

            symbols = symbols.split(',');
            gramma = gramma.split('\n');
            gramma = gramma.reverse();

            var root = 'S',
                grammaMap = grammaToMap(gramma, symbols),
                regexp = grammaMap[root],
                toReplace,
                detectedSymbols,
                hasTerminalsOnlyMap = (function () {
                    var map = {};
                    _.forEachRight(symbols, function (symbol) {
                        if (hasTerminalsOnly(grammaMap[symbol], symbols)) {
                            map[symbol] = grammaMap[symbol].expression;
                        }
                    });
                    return map;
                }());

            while (true) {
                detectedSymbols = detectSymbols(regexp, symbols);
                if (!detectedSymbols.length) {
                    break;
                }
                _.forEachRight(detectedSymbols, function (detectedSymbol) {
                    toReplace = grammaMap[_.findKey(grammaMap, function (entry) {
                        return entry.symbol === detectedSymbol;
                    })];
                    var expression = toReplace.expression;
                    regexp.expression = regexp.expression.replace(new RegExp(detectedSymbol, 'g'), expression);
                });

                // check again perhaps it is over right now
                detectedSymbols = detectSymbols(regexp, symbols);
                if (!detectedSymbols.length) {
                    break;
                } else {
                    regexp = detectRepetitions(regexp);
                }
            }

            // at this point we have an expression containing only terminal symbols lets wrap them up
            _.forEachRight(_.values(hasTerminalsOnlyMap), function (expr) {
                var newExpr = expr.length !== 1 ? '[' + expr + ']' : expr;
                if (newExpr !== expr) {
                    regexp.expression = regexp.expression.replace(new RegExp(RegExp.quote(expr), 'g'), newExpr);
                }
            });

            regexp.toString = function () {
                return this.symbol + parser.equalSymbol + this.expression;
            };

            console.log(regexp.toString());
        }

    };

}(window));