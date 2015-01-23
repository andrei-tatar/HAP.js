var self = module.exports = function(writers) {
    var logMessage = function(tag, msg, ex) {
        var logMessage = 
        {
            tag:tag, 
            message:msg, 
            exception:ex, 
            timestamp:Date.now()
        };
        writers.forEach(function (wr) { wr.write(logMessage); });
    };
    
    this.i = function (msg, ex) {
        logMessage("i", msg, ex);
    };
    
    this.e = function(msg, ex) {
        logMessage("e", msg, ex);
    };
    
    this.w = function(msg, ex) {
        logMessage("w", msg, ex);
    };
    
    this.v = function(msg, ex) {
        logMessage("v", msg, ex);
    };
};
self.__meta = {
    imports: ":logWriter_.*",
    exports: "log"
};