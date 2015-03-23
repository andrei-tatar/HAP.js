var self = module.exports = function(util, $pluginDir) {
    var template = new util.LazyTemplate("collapsible.html", $pluginDir);
    
    this.init = function (web) {
        web.Collapsible = function(opt) {
            opt = opt || {};
            var collapsible = new web.Container(template);
            collapsible.css = opt.css;
            collapsible.collapsed = opt.collapsed;
            collapsible.title = opt.title;
            return collapsible;
        };
    };
};
self.__meta = {
    exports: "web_collapsible"
};