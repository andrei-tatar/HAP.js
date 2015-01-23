var self = module.exports = function(webcontainer, dot, fs, path, __dir) {
	this.create = function(opt) {
		var g = webcontainer.create(fs.readFileSync(path.join(__dir, "collapsible.html")));
		for (var key in opt) {
			g[key] = opt[key];
		}
		return g;
	};
};
self.__meta = {
	exports: "collapsible"
};