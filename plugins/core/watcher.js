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

var self = module.exports = function() {
    this.create = function(obj, callback) {
        return new objectObserver(obj, callback);
    };
};
self.__meta = {
    exports: "watcher"
};