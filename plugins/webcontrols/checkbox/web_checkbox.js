module.exports = function(util, $pluginDir) {
    var template = new util.LazyTemplate("checkbox.html", $pluginDir);
    var express = require('express');

    this.init = function (web) {
        web.Checkbox = function(opt) {
            opt = opt || {};

            util.copyProperties(this, opt);
            util.createProperty(this, "text", opt.text || "");
            util.createProperty(this, "checked", opt.checked || false);
            util.createProperty(this, "enabled", opt.enabled == undefined ? true : opt.enabled);

            this.on("text", function (arg) {
                if (this.id)
                    web.emit("chkut", {id: this.id, value: arg});
            });

            this.on("checked", function (arg) {
                if (this.id)
                    web.emit("chkuc", {id: this.id, value: this.checked});
            });

            this.on("enabled", function (arg) {
                if (this.id)
                    web.emit("chkue", {id: this.id, value: arg});
            });

            this.html = function () {
                return template.value(this);
            };
        };

        require("util").inherits(web.Checkbox, require("events").EventEmitter);

        web.on("chk_ch", function (arg) {
            var checkbox = web.findControl(arg.id);
            if (checkbox && checkbox.enabled) checkbox.checked = arg.value;;
        });

        web.app.use(express.static(require("path").join($pluginDir, '.static')));
        web.append("<script src='js/checkbox.js'></script>");
    }
};