var self = module.exports = function(fs, dot) {
    var path = require("path");
    
    this.throttle = function(timeout, callback) {
        var timer = undefined;
        
        return function() {
            if (timer) clearTimeout(timer);
            timer = setTimeout(callback, timeout);
        };
    };
    
    this.readFile = function (name, dir) {
        return fs.readFileSync(path.join(dir, name));
    };
    
    this.readTemplate = function (name, dir) {
        return dot.template(fs.readFileSync(path.join(dir, name)));
    };
    
    this.lazy = function (generator) {
        var v = undefined;
        return {
            value: function() {
                return v || (v = generator());
            }
        };
    };
    
    this.lazyTemplate = function(name, dir) {
        var v = undefined;
        return {
            value: function() {
                return v || (v = dot.template(fs.readFileSync(path.join(dir, name))));
            }
        };
    };
    
    this.isFunction = function (functionToCheck) {
        var getType = {};
        return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
    };
    
    this.createProperty = function (obj, name, initialValue) {
        var value = initialValue;
        obj.__defineGetter__(name, function(){return value;});
        obj.__defineSetter__(name, function(arg) {
            if (value === arg) return;
            value = arg;
            this.emit(name, value);
        });
    };
    
    Array.prototype.first = function (check) {
        for (var i=0; i<this.length; i++) {
            var item = this[i];
            if (!check || check(item))
                return item;
        }
    };
    
    Array.prototype.remove = function (item) {
        var index = this.indexOf(item);
        if (index > -1) {
            this.splice(index, 1);
            return true;
        }
        
        return false;
    };
};
self.__meta = {
    exports: "util"
};