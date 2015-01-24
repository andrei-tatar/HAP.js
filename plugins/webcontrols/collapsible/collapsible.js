var self = module.exports = function(util, $pluginDir) {
    var template = util.lazyTemplate("collapsible.html", $pluginDir);
    
    this.init = function (web) {
        web.Collapsible = function(opt) {
            var collapsible = new web.Container(template);
            collapsible.title = opt.title;
            return collapsible;
        };
    };
};
self.__meta = {
    exports: "web_collapsible"
};