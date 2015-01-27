var self = module.exports = function(util, $pluginDir, express, path) {
    var template = util.lazyTemplate("button.html", $pluginDir);
    
    this.init = function (web) {
        web.Button = function(button) {
            button = button || {};
            button.html = function () {
                return template.value()(button);
            };
            return button;
        };
        
        web.on("bt_clk", function (id) {
            var button = web.findControl(id, true);
            if (button && button.click)
                button.click();
        });
        
        web.app.use(express.static(path.join($pluginDir, '.static')));
        web.append("<script src='js/button.js'></script>");
    }
};
self.__meta = {
    exports: "web_button"
};