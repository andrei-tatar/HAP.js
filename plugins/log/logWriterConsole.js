var self = module.exports = function() {
    this.write = function (l) {
        var time = new Date(l.timestamp);
        var ex = l.ex ? " (" + l.ex + ")" : "";
        var timetag = time.getHours() + ":" + time.getMinutes() + ":" + time.getSeconds();
        console.log("[" + timetag + "][" + l.tag + "]" + l.message + ex);
    };
};
self.__meta = {
    exports: "logWriter_console"
};