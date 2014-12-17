var self = module.exports = function() {
	this.write = function (e) {
		console.log(e.tag + ": " + e.message + (e.ex ? " (" + e.ex + ")" : ""));
	};
};
self.__meta = {
	exports: "logWriterConsole"
};