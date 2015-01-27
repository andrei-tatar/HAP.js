var self = module.exports = function(util, $pluginDir) {
    var template = util.lazyTemplate("tabpage.html", $pluginDir);
    
    this.init = function (web) {
        web.TabPage = function (opt) {
            return new web.Container(template, opt);
        };
    }
};
self.__meta = {
    exports: "web_tabpage"
};
