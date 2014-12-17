var fs = require("fs");
var path = require("path");

var exported = []; //dependencies exported by plugins
var manualinjected = []; //manually injected dependencies
var unresolved = []; //plugins not resolved because of missing dependencies

function resolveDependency(name, failOptionalDependencies) {
	console.log(name + " - " + failOptionalDependencies);
	var makeArray = false;
	var required = true;
	if (name.indexOf(":") == 0) {
		makeArray = true;
		name = name.substr(1);
		if (failOptionalDependencies) return { value: undefined, required: true };
	}
	if (name.indexOf("?") == 0) {
		required = false;
		name = name.substr(1);
		if (failOptionalDependencies) return { value: undefined, required: true };
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
	if (name.indexOf("logWriter") > 0)
		console.log(exported);
	return { value: val, required: required };
};

function resolveDependencies(names, failOptionalDependencies) {
	if (typeof names == "string")
		names = [names];
	if (!names || names.length == 0)
		return { params: [], missing: [] };

	var args = [];
	var missing = [];
	for (var i=0; i<names.length; i++) {
		var dep = resolveDependency(names[i], failOptionalDependencies);
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

function tryCreatePlugin(plugin, failOptionalDependencies) {
	if (!plugin.bind) return true;

	var meta = plugin.__meta || {};
	var imports = meta.imports === "" ? "" : meta.imports || [];

	var dep = resolveDependencies(imports, failOptionalDependencies);
	if (dep.missing.length == 0) {
		var instance = applyToConstructor(plugin, dep.params);
		addExport(exported, meta.exports, instance);
		return true;
	} else {
		plugin.__missing = dep.missing;
	}

	return false;
};

function addExport(where, name, plugin) {
	if (!name || !name.length || name.length == 0) return;
	where.push({ key: name, value: plugin });
};

function composePlugins(pluginsPath, onError, onDone, recursive) {
	unresolved = [];
	exported = [];

	var oncomplete = function () {
		var pass = 0;
		while (unresolved.length != 0) {
			var anyResolved = false;
			for (var i=0; i<unresolved.length; i++) {
				if (tryCreatePlugin(unresolved[i], pass == 0)) {
					unresolved.splice(i, 1);
					i--;
					anyResolved = true;
					continue;
				}
			}

			console.log("Pass : "+(pass++) + " - " + anyResolved);

			if (!anyResolved) {
				if (onError) {
					var missing = [];
					for (var i=0; i<unresolved.length; i++) {
						var p = unresolved[i];
						missing.push({name: p.__name, missing: p.__missing});
					}
					onError(missing);
				}
				return false;
			}
		}

		return true;
	};

	var count = 0;
	function onDirComplete() {
		if (--count == 0)
			if (oncomplete())
				onDone();
	};

	var loadFromDir = function (dir) {
		count++;
		fs.readdir(dir, function(err, files) {
			if (err) { onDirComplete(); return; }
			for (var i=0; i<files.length; i++) {
				var file = files[i];
				var fullPath = path.join(dir, file);
				var stat = fs.statSync(fullPath);
				if (stat && stat.isDirectory()) {
					if (recursive)
						loadFromDir(fullPath);
					continue;
				}

				var plugin = require (fullPath);
				plugin.__dir = dir;
				plugin.__path = fullPath;
				plugin.__name = file;
				if (!tryCreatePlugin(plugin, true))
					unresolved.push(plugin);
			}
			onDirComplete();
		});
	};

	loadFromDir(pluginsPath);

	return true;
};

module.exports = function (pluginpath, recursive) {
	this.resolve = function (name) {
		return resolveDependency(name).value;
	};

	this.inject = function (name, plugin) {
		addExport(manualinjected, name, plugin);
	};

	this.compose = function (options) {
		options = options || {};
		return composePlugins(pluginpath, options.error, options.done, recursive);
	};
};
