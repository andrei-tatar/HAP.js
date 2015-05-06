module.exports = function(util, $pluginDir) {
    var template = new util.LazyTemplate("label.html", $pluginDir);
    var express = require('express');

    this.init = function (web) {
        web.Label = function(opt) {
            opt = opt || {};

            util.copyProperties(this, opt);
            util.createProperty(this, "text", opt.text || '');

            this.on("text", function (arg) {
                if (this.id)
                    web.emit("lbut", {id: this.id, value: arg});
            });
            
            this.html = function () {
                return template.value(this);
            };
        };
        
        require("util").inherits(web.Label, require("events").EventEmitter);

        web.app.use(express.static(require("path").join($pluginDir, '.static')));
        web.append("<script src='js/label.js'></script>");
    }
};