module.exports = function(util, $pluginDir) {
    var template = new util.LazyTemplate("button.html", $pluginDir);
    var express = require('express');

    this.init = function (web) {
        web.Button = function(opt) {
            opt = opt || {};
            
            this.css = opt.css;
            this.order = opt.order;
            
            util.createProperty(this, "text", opt.text || "");
            this.on("text", function (arg) {
                if (this.id)
                    web.emit("btut", {id: this.id, value: arg});
            });
            
            util.createProperty(this, "enabled", opt.enabled == undefined ? true : opt.enabled);
            this.on("enabled", function (arg) {
                if (this.id)
                    web.emit("btue", {id: this.id, value: arg});
            });
            
            this.html = function () {
                return template.value(this);
            };
        };
        
        require("util").inherits(web.Button, require("events").EventEmitter);
        
        web.on("bt_clk", function (id) {
            var button = web.findControl(id);
            if (button && button.enabled) button.emit("click");
        });
        
        web.app.use(express.static(require("path").join($pluginDir, '.static')));
        web.append("<script src='js/button.js'></script>");
    }
};