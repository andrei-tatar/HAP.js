var self = module.exports = function(util, $pluginDir) {
    var template = util.lazyTemplate("tabpage.html", $pluginDir);
    
    this.init = function (web) {
        web.TabPage = function (opt) {
            var page = new web.Container(template);
            page.title = opt.title;
            return page;
        };
    }
};
self.__meta = {
    exports: "web_tabpage"
};
