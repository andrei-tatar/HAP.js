var path = require("path");
var Catalog = require("./catalog");
var catalog = new Catalog(
	[
		path.join(__dirname, "plugins"), 
		path.join(__dirname, "scripts")
	], true);
	
catalog.inject("preferencesPath", "prefs.json");
catalog.inject("fs", require("fs"));
catalog.inject("path", require("path"));
catalog.inject("dot", require("dot"));
catalog.inject("express", require("express"));
catalog.inject("catalog", catalog);
catalog.compose({
	//debug: true,
	error: function (missingDeps) {
		missingDeps.forEach(function (m) {
			var names = m.missing.reduce(function (a, b) { return a + "," + b; });
			console.log("Missing in " + m.name + ": " + names);
		});
	},
	done: function () {
		var log = catalog.resolve("log");
		log.i("All composed!");
	}
});
