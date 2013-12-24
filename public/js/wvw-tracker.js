(function () {
/**
 * almond 0.2.6 Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);

                name = baseParts.concat(name.split("/"));

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            } else if (name.indexOf('./') === 0) {
                // No baseName, so this is ID is resolved relative
                // to baseUrl, pull off the leading dot.
                name = name.substring(2);
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (typeof callback === 'function') {

            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback.apply(defined[name], args);

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        config = cfg;
        if (config.deps) {
            req(config.deps, config.callback);
        }
        return req;
    };

    /**
     * Expose module registry for debugging and tooling
     */
    requirejs._defined = defined;

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("node_modules/almond/almond", function(){});

define('lib/api',['require','exports','module'],function (require, exports, module) {
var api,
    matchListUrl = "https://api.guildwars2.com/v1/wvw/matches.json",
    matchDetailsUrl = "https://api.guildwars2.com/v1/wvw/match_details.json",
    worldNamesUrl = "https://api.guildwars2.com/v1/world_names.json?lang=en",
    worldNames = {};

function makeRequest(url, options, success, error) {
    options = options || {};
    var requestUrl = url + "?",
        queryStringParams = {},
        option;

    for (option in options) {
        if (options.hasOwnProperty(option)) {
            queryStringParams[option] = options[option];
        }
    }
    requestUrl += $.param(queryStringParams);

    $.ajax({
        url: requestUrl,
        type: "get",
        data: undefined,
        success: function (result) {
            var value = typeof result === "string" ? result : JSON.stringify(result);
            if (result && success) {
                success(result);
            } else if (error) {
                error(result);
            }
        },
        error: function (jqxhr, errorMsg) {
                   error(errorMsg);
               }
    });
}

function findWorldId(name, callback) {
    makeRequest(worldNamesUrl, {}, function (data) {
        var worldId;

        data.forEach(function (dataPoint) {
            worldNames[dataPoint.id] = dataPoint.name;
            if (dataPoint.name === name) {
                worldId = dataPoint.id;
            }
        });

        callback({
            "worldId": worldId
        });
    });
}

function findWvWMatchId(worldId, callback) {
    worldId = parseInt(worldId);
    makeRequest(matchListUrl, {}, function (data) {
        data.wvw_matches.forEach(function (dataPoint) {
            if (dataPoint.red_world_id === worldId
                || dataPoint.green_world_id === worldId
                || dataPoint.blue_world_id === worldId) {
                callback({
                    "matchId": dataPoint.wvw_match_id,
                    "red": worldNames[dataPoint.red_world_id],
                    "green": worldNames[dataPoint.green_world_id],
                    "blue": worldNames[dataPoint.blue_world_id],
                    "endTime" : dataPoint.end_time
                });
            }
        });
    });
}

function findMatchDetails(matchId, callback) {
    makeRequest(matchDetailsUrl, {"match_id": matchId}, function (data) {
        callback({
            scores: {
                "red": data.scores[0],
                "blue": data.scores[1],
                "green": data.scores[2],
            }
        });
    });
}

function findMatchScore(name, callback) {
    findWorldId(name, function (data) {
        findWvWMatchId(data.worldId, function (matchData) {
            findMatchDetails(matchData.matchId, function (data) {
                var scores = [];
                scores.push({
                    "name": matchData.red,
                    "score": data.scores.red,
                    "color": "rgba(255, 0, 0, 0.2)"
                });
                scores.push({
                    "name": matchData.green,
                    "score": data.scores.green,
                    "color": "rgba(0, 255, 0, 0.2)"
                });
                scores.push({
                    "name": matchData.blue,
                    "score": data.scores.blue,
                    "color": "rgba(0, 0, 255, 0.2)"
                });

                function compare(a,b) {
                    if (a.score > b.score)
                        return -1;
                    if (a.score < b.score)
                        return 1;
                    return 0;
                }

                scores.sort(compare);
                callback(scores);
            });
        });
    });
}

function findTimeLeft(name, callback) {
    findWorldId(name, function (data) {
        findWvWMatchId(data.worldId, callback);
    });
}
api = {
    findWorldId: findWorldId,
    findWvWMatchId: findWvWMatchId,
    findMatchScore: findMatchScore,
    findTimeLeft: findTimeLeft
};

module.exports = api;
});

define('lib/views/scores',['require','exports','module','../api'],function (require, exports, module) {
var View,
    viewTemplate,
    api = require("../api");

View = Backbone.View.extend({
    initialize: function () {
        var view = this;
        $.get("templates/scores.html", function (data) {
            viewTemplate = data;
            view.render();
        });
    },
    render: function () {
        var view = this;
        api.findMatchScore(this.model.get("worldName"), function (scores) {
            var template = _.template(viewTemplate, {
                scores: scores
            });
            view.$el.html(template);
        });

    },
    display: function (model) {
        this.render();
    },
    hide: function () {
        this.$el.hide();
    }
});

module.exports = View;
});

define('lib/views/timeleft',['require','exports','module','../api'],function (require, exports, module) {
var View,
    viewTemplate,
    api = require("../api");

View = Backbone.View.extend({
    initialize: function () {
        var view = this;
        $.get("templates/timeleft.html", function (data) {
            viewTemplate = data;
            api.findTimeLeft(view.model.get("worldName"), view.render.bind(view));
        });
    },
    render: function (data) {
        var timeleft = countdown(new Date(data.endTime), null, countdown.HOURS|countdown.MINUTES|countdown.SECONDS|countdown.MILLISECONDS);
        var template = _.template(viewTemplate, {
            timeleft: {
                hours: timeleft.hours,
                mins: timeleft.minutes < 10 ? ("0" + timeleft.minutes) : timeleft.minutes,
                secs: timeleft.seconds < 10 ? ("0" + timeleft.seconds) : timeleft.seconds,
                msecs: timeleft.milliseconds < 100 ? "0" : timeleft.milliseconds.toString()[0]
            }
        });
        this.$el.html(template);
        setTimeout(this.render.bind(this, data), 100);
    },
    display: function (model) {
        this.model = model;
        this.render();
    },
    hide: function () {
        this.$el.hide();
    }
});

module.exports = View;
});

define('lib/models/scores',['require','exports','module'],function (require, exports, module) {
var Scores = Backbone.Model.extend({
    sync: function () {
     }
});

module.exports = Scores;

});

define('lib/main',['require','exports','module','./views/scores','./views/timeleft','./models/scores'],function (require, exports, module) {
var ScoresView = require("./views/scores"),
    TimeLeftView = require("./views/timeleft"),
    ScoresModel = require("./models/scores");

function onDocumentReady() {
    var worldName = prompt("Server name?", localStorage && localStorage.worldName || ""),
        scoresModel = new ScoresModel({
            worldName: worldName
        });
    localStorage.worldName = worldName;

    window.views = {};

    window.views.scores = new ScoresView({
        model: scoresModel,
        el: $("#scores")
    });

    window.views.timeleft = new TimeLeftView({
        model: scoresModel,
        el: $("#timeleft")
    });
}

// init
$(document).ready(onDocumentReady);
});

require(["./lib/main"]);
}());