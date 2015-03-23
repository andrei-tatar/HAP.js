var self = module.exports = function(util, $pluginDir) {
    var template = new util.LazyTemplate("tabpage.html", $pluginDir);
    
    this.init = function (web) {
        web.TabPage = function (opt) {
            opt = opt || {};
            var tabPage = new web.Container(template);
            tabPage.title = opt.title;
            tabPage.order = opt.order;
            return tabPage;
        };
    }
};
self.__meta = {
    exports: "web_tabpage"
};
