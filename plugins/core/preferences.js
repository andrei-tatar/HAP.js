function objectObserver(obj, ponchanged) {
	var observers = {};
	var onchanged = function (changes) {
		var grouped = {};
		changes.forEach(function (change) {
			grouped[change.name] = change;
		});
		for (var key in grouped) {
			var change = grouped[key];
			switch (change.type) {
				case "add": 
				case "update":
					var prev = observers[key];
					if (prev) prev.stop();
					var sub = obj[key];
					if (typeof sub === "object")
						observers[key] = new objectObserver(sub, ponchanged);
					break;
				case "delete":
					var prev = observers[key];
					if (prev) prev.stop();
					delete observers[key];
					break;
			}
			
			ponchanged();
		}
	};

	Object.observe(obj, onchanged);
	for (var key in obj) {
		var sub = obj[key];
		if (typeof sub === "object")
			observers[key] = new objectObserver(sub, ponchanged);
	}
	
	this.stop = function() {
		Object.unobserve(obj, onchanged);
		for (var key in observers)
			observers[key].stop();
	};
};

var self = module.exports = function(fs, log, path, saveTimeout) {
	saveTimeout = saveTimeout || 500;
	path = path || "preferences.json";
	
	var load = function () {
		try {
			var data = fs.readFileSync(path);
			var obj = JSON.parse(data);
			for (var k in obj) {
				this[k] = obj[k];
			}
		}
		catch (e) {
			log.e("Could not load preferences", e);
		}
	}.bind(this);

	var save = function() {
		var data = JSON.stringify(this, null, 4);
		fs.writeFile(path, data, function (e) {
			if (e) {
				log.e("Could not save preferences", e);
			} else {
				log.i("Preferences saved");
			}
		});
	}.bind(this);
	
	load();
	
	var timer = undefined;
	
	new objectObserver(this, function() {
		if (timer) clearTimeout(timer);
		timer = setTimeout(save, saveTimeout);
	});
};
self.__meta = {
	imports: ["fs", "log", "?preferencesPath", "?preferencesSaveTimeout"],
	exports: "preferences"
};