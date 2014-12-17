var watcher = function(obj, path, onchanged) {
	var prevValue = undefined;
	var subWatcher = undefined;
	var parts = path.split('\.');
	var ofInterest = parts[0];
	var notifyValueChanged = function () {
		var v = this.value();
		if (prevValue === v) return;
		prevValue = v;
		onchanged(v);
	}.bind(this);
	var createSubObserver = function () {
		if (!parts) return;
		if (subWatcher) {
			subWatcher.dispose();
			subWatcher = undefined;
		}
		var val = obj[ofInterest];
		if (val) {
			subWatcher = new watcher(val, parts, notifyValueChanged);
		}
	}.bind(this);
	var observedChanged = function(changes) {
		if (changes.some(function(c) { return c.name === ofInterest; })) {
			createSubObserver();
			notifyValueChanged();
		}
	};
	this.value = function () {
		return subWatcher ? subWatcher.value() : obj[ofInterest];
	};
	this.dispose = function () {
		Object.unobserve(obj, observedChanged);
	};
	
	Object.observe(obj, observedChanged);
	parts.splice(0, 1);
	parts = parts.length >= 1 ? 
		parts.reduce(function(a,b){return a+"."+b;}) :
		undefined;
	
	createSubObserver();
	prevValue = this.value();
};


var self = module.exports = function(log) {
	function setValue(obj, propPath, value) {
		var parts = propPath.split('\.');
		var prop = parts[0];
		for (var i=0; i<parts.length-1; i++) {
			obj = obj[parts[i]];
			if (!obj) return false;
			prop = parts[i+1];
		}
		obj[prop] = value;
		return true;
	};

	this.bind = function(src, srcPath, dst, dstPath, convert) {
		convert = convert || function(v) {return v;};
		return this.watch(src, srcPath, function(v) {
			if (!setValue(dst, dstPath, convert(v)))
				log.w("Could not update binding destination!");
		}, true);
	};
	
	this.bind2 = function(src, srcPath, dst, dstPath, convert, convertBack) {
		convertBack = convertBack || convert || function(v) {return v;};
		var b = this.bind(src, srcPath, dst, dstPath, convert);
		var w = this.watch(dst, dstPath, function(v) {
			if (!setValue(src, srcPath, convertBack(v)))
				log.w("Could not update binding source!");
		});
		return function() { b(); w(); };
	};
	
	this.watch = function(obj, path, onchanged, triggerNow) {
		var w = new watcher(obj, path, onchanged);
		if (triggerNow) onchanged(w.value());
		return w.dispose;
	};
};
self.__meta = {
	imports: "log",
	exports: "binding"
};