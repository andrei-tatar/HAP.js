var fs = require("fs");
var path = require("path");
var esprima = require("esprima");

var exported = []; //dependencies exported by plugins
var manualinjected = []; //manually injected dependencies

function resolveDependency(name, plugin) {
    if (name == "$pluginDir")
        return { value: plugin.__dir, required: false };

    var makeArray = false;
    var required = true;
    if (name.indexOf(":") == 0) {
        makeArray = true;
        name = name.substr(1);
    }
    if (name.indexOf("?") == 0) {
        required = false;
        name = name.substr(1);
    }

    name = "^" + name + "$";
    var dependencies = [];
    var available = exported.concat(manualinjected);
    for (var i=0; i<available.length; i++) {
        var pair = available[i];
        if (pair.key.match(name))
            dependencies.push(pair.value);
    }

    var val;
    if (dependencies.length == 0)
        val = makeArray ? [] : undefined;
    else if (dependencies.length == 1 && !makeArray)
        val = dependencies[0];
    else
        val = dependencies;
    return { value: val, required: required };
};

function resolveDependencies(names, plugin) {
    if (typeof names == "string")
        names = [names];
    if (!names || names.length == 0)
        return { params: [], missing: [] };

    var args = [];
    var missing = [];
    for (var i=0; i<names.length; i++) {
        var dep = resolveDependency(names[i], plugin);
        if (dep.required && !dep.value) {
            missing.push(names[i]);
            continue;
        }

        args.push(dep.value);
    }
    return { params: args, missing: missing };
};

function applyToConstructor(constructor, argArray) {
    var args = [null].concat(argArray);
    var factoryFunction = constructor.bind.apply(constructor, args);
    return new factoryFunction();
};

function getImports(plugin) {
    if (plugin.__imports)
        return plugin.__imports;
        
    var imp = (plugin.__meta || {}).imports;
    if (!imp) {
        var parsed = esprima.parse("safetyValve = " + plugin.toString())
        imp = parsed.body[0].expression.right.params.map(function(c){return c.name;});
    }
    
    plugin.__imports = typeof imp == "string" ? [imp] : imp;
    return plugin.__imports;
};

function tryCreatePlugin(plugin) {
    if (!plugin.bind) return true;

    var meta = plugin.__meta || {};
    var imports = getImports(plugin);    

    var dep = resolveDependencies(imports, plugin);
    if (dep.missing.length == 0) {
        var instance = applyToConstructor(plugin, dep.params);
        addExport(exported, meta.exports, instance);
        instance.__dir = plugin.__dir;
        instance.__path = plugin.__path;
        instance.__name = plugin.__name;
        return true;
    } else {
        plugin.__missing = dep.missing;
    }

    return false;
};

function addExport(where, name, plugin) {
    if (!name || !name.length || name.length == 0) return;
    plugin.__exports = name;
    where.push({ key: name, value: plugin });
};

function isFunction(functionToCheck) {
    var getType = {};
    return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
}

function composePlugins(paths, onError, onDone, recursive, debug) {
    exported = [];

    var dirCount = 0;
    var unresolved = [];
    
    function onDirComplete() {
        if (--dirCount != 0) return;
        
        var resolveLater = function (i) {
            return i.indexOf("?") == 0 || i.indexOf(":") == 0;
        };
        
        unresolved.sort(function (a,b) {
            var ia = getImports(a), ib = getImports(b);
            if (ia.some(resolveLater)) return 1;
            if (ib.some(resolveLater)) return -1;
            return ia.length - ib.length;
        });
        
        if (debug) {
            console.log("Resolve plugins/dependencies in order:");
            unresolved.forEach(function(p){console.log(p.__name, getImports(p));});
        }
        
        while (unresolved.length != 0) {
            var anyResolved = false;
            for (var i=0; i<unresolved.length; i++) {
                var plugin = unresolved[i];
                var result;
                try {    
                    if (tryCreatePlugin(plugin)) {
                        unresolved.splice(i, 1);
                        anyResolved = true;
                        if (debug) result = "Resolved!";
                        break;
                    }
                    if (debug)
                        result = "Missing " + plugin.__missing;
                }
                finally {
                    if (debug)
                        console.log("Resolving " + plugin.__name + "... " + result);
                }
            }
            
            if (!anyResolved) {
                if (onError) {
                    var missing = [];
                    for (var i=0; i<unresolved.length; i++) {
                        var p = unresolved[i];
                        missing.push({name: p.__name, missing: p.__missing});
                    }
                    
                    onError(missing);
                }
                return;
            }
        }
        
        onDone();
    };

    var loadFromDir = function (dir) {
        dirCount++;
        fs.readdir(dir, function(err, files) {
            if (err) { onDirComplete(); return; }
            for (var i=0; i<files.length; i++) {
                var file = files[i];
                if (file.indexOf('.') == 0)
                    continue;
                    
                var fullPath = path.join(dir, file);
                var stat = fs.statSync(fullPath);
                if (stat && stat.isDirectory()) {
                    if (recursive)
                        loadFromDir(fullPath);
                    continue;
                }

                if (path.extname(file).toLowerCase() != ".js")
                    continue;
                
                var plugin = require(fullPath);
                if (!isFunction(plugin)) {
                    if (debug)
                        console.log("Ignoring not function plugin " + file);
                    continue;
                }

                plugin.__dir = dir;
                plugin.__path = fullPath;
                plugin.__name = file;
                unresolved.push(plugin);
            }
            onDirComplete();
        });
    };

    paths.forEach(loadFromDir);
};

module.exports = function (paths, recursive) {
    this.resolve = function (name) {
        return resolveDependency(name).value;
    };

    this.inject = function (name, plugin) {
        addExport(manualinjected, name, plugin);
    };

    this.compose = function (options) {
        options = options || {};
        if (typeof paths === "string") paths = [paths];
        composePlugins(paths, options.error, options.done, recursive, options.debug);
    };
};
