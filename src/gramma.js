(function (window) {

    _.mixin({
        'quote' : function (str) {
            return (str + '').replace(/[.?*+^$[\]\\(){}|-]/g, "\\$&");
        },
        'format': function format(string, args) {
            var newStr = string;
            for (var key in args) {
                //noinspection JSUnfilteredForInLoop
                newStr = newStr.replace('{' + key + '}', args[key]);
            }
            return newStr;
        }
    });

    /**
     * <b>Parser</b> allows to parse each sentence of the grammar into the normalized
     * form of it, for instance B:==LLL will be changed to B:==L{3}, hence telling, as
     * it would be using regexp, that L symbol is repeated 3 times
     * @param tSymbols terminal symbols of the gramma
     * @constructor
     */
    var Parser = function Parser(tSymbols) {
        this.symbols.terminals = _.union(tSymbols, []);
    };
    Parser.prototype = {
        symbols            : {
            terminals   : undefined,
            nonTerminals: ['|']
        },
        equalSymbol        : '::=',
        toOccurrencesString: function (symbol, occurred) {
            return _.format('{symbol}{{occurred}}', {
                symbol  : symbol,
                occurred: occurred
            })
        },
        normalizeExpression: function (expr) {
            var asArray = expr.split(''),
                length = asArray.length,
                uniqueSymbols = _.uniq(asArray),
                normalizer = {},
                self = this;

            if (uniqueSymbols.length === 1) {
                normalizer.get = _.bind(self.toOccurrencesString, normalizer, asArray[0], length);
            } else {
                normalizer.get = function () {
                    var it = 0,
                        symbol = asArray[it],
                        occurrences = 0,
                        nextAvailable,
                        nextSymbol,
                        newExpr = [];

                    for (it; it < length; it++) {
                        nextAvailable = (it + 1) < length;
                        if (nextAvailable) {
                            nextSymbol = asArray[it + 1];
                            if (nextSymbol === symbol) {
                                occurrences++;
                            } else {
                                // need to save given group and reset occurrences
                                // as well as to reset current symbol to the next one
                                if (occurrences > 1) {
                                    newExpr.push(self.toOccurrencesString(symbol, occurrences));
                                } else {
                                    newExpr.push(symbol);
                                }
                                occurrences = 0;
                                symbol = nextSymbol;
                            }
                        } else {
                            newExpr.push(symbol);
                        }
                    }

                    return newExpr.join('');
                }
            }

            return normalizer;
        },
        toGrammarObject    : function (str) {
            if (!str) {
                return false;
            }
            str = str.split(this.equalSymbol);

            var symbol = str[0],
                expr = str[1];

            if (this.symbols.terminals.indexOf(symbol) >= 0) {
                return {
                    symbol    : symbol,
                    expression: this.normalizeExpression(expr).get()
                }
            } else {
                alert('BAD expression');
            }
        }
    };

    function grammaToMap(gramma, symbols) {
        var parser = new Parser(symbols),
            grammaMap = {},
            length = gramma.length,
            chunk;

        while (length--) {
            chunk = gramma[length];
            chunk = parser.toGrammarObject(chunk);
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
                }
            }

            // at this point we have an expression containing only terminal symbols lets wrap them up
            _.forEachRight(_.values(hasTerminalsOnlyMap), function (expr) {
                var newExpr = expr.length !== 1 ? '(' + expr + ')' : expr;
                if (newExpr !== expr) {
                    regexp.expression = regexp.expression.replace(new RegExp(_.quote(expr), 'g'), newExpr);
                }
            });

            regexp.toString = function () {
                return this.symbol + '::=' + this.expression;
            };

            console.log(regexp.toString());

            return regexp.toString();
        }

    };

}(window));