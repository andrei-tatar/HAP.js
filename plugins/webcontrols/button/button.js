var self = module.exports = function(web, webcontainer, dot, fs, path, __dir) {
	var template = dot.template(fs.readFileSync(path.join(__dir, "button.html")));
	
	this.create = function(opt) {
		var button = {
			html: function () {
				return template(button);
			}
		};
		for (var key in opt) {
			button[key] = opt[key];
		}
		return button;
	};
	
	web.on("button click", function (id) {
		var button = webcontainer.find(id);
		if (button && button.click)
			button.click();
	});
	
	web.append(fs.readFileSync(path.join(__dir, "static.jst")));
};
self.__meta = {
	exports: "button"
};