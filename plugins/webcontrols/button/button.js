var self = module.exports = function(util, $pluginDir) {
    var template = util.lazyTemplate("button.html", $pluginDir);
    
    this.init = function (web) {
        web.Button = function(opt) {
            var button = {
                html: function () {
                    return template.value()(button);
                }
            };
            for (var key in opt) {
                button[key] = opt[key];
            }
            return button;
        };
        
        web.on("button click", function (id) {
            var button = web.findControl(id, true);
            if (button && button.click)
                button.click();
        });
        
        web.append(util.readFile("button.static.html", $pluginDir));
    }
};
self.__meta = {
    exports: "web_button"
};