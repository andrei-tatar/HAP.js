var self = module.exports = function() {
    this.throttle = function(timeout, callback) {
        var timer = undefined;
        
        return function() {
            if (timer) clearTimeout(timer);
            timer = setTimeout(callback, timeout);
        };
    };
};
self.__meta = {
    exports: "util"
};