module.exports = function(util, $pluginDir) {
    var template = new util.LazyTemplate("slider.html", $pluginDir);
    var express = require('express');

    this.init = function (web) {
        web.Slider = function (opt) {
            opt = opt || {};
            this.min = opt.min || 0;
            this.max = opt.max || 0;
            this.step = opt.step || 0;
            this.css = opt.css;
            this.order = opt.order;
            
            util.createProperty(this, "value", opt.value || 0);
            this.on("value", function (arg) {
                if (this.id)
                    web.emit("slu", {id: this.id, value: arg});
            });
            
            this.html = function () {
                return template.value(this);
            };
        };
        
        require("util").inherits(web.Slider, require("events").EventEmitter);
        
        web.app.use(express.static(require("path").join($pluginDir, '.static')));
        web.append("<script src='js/bootstrap-slider.min.js'></script>");
        web.append("<script src='js/slider.js'></script>");
        web.appendHead("<link rel='stylesheet' href='css/bootstrap-slider.min.css'>");
        
        web.on("slc", function (data) {
            var slider = web.findControl(data.id);
            if (!slider) return;
            slider.value = data.value;
        });
    };
};