var path = require("path");
var Catalog = require("./catalog");
var catalog = new Catalog(path.join(__dirname, "plugins"), true);
catalog.inject("preferencesPath", "prefs.json");
catalog.inject("fs", require("fs"));
catalog.compose({
	error: function (missingDeps) {
		missingDeps.forEach(function (m) {
			var names = m.missing.reduce(function (a, b) { return a + "," + b; });
			console.log("Missing in " + m.name + ": " + names);
		});
	},
	done: function () {
		//console.log("All plugins composed!");
	}
});
return;


var express = require('express');
var app = express();

app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
	res.redirect("/index.html");
});

var server = app.listen(3000, function () {
	var address = server.address();
	console.log('Listening at http://%s:%s', address.address, address.port);
});
