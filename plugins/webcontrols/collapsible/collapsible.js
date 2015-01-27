var self = module.exports = function(util, $pluginDir) {
    var template = util.lazyTemplate("collapsible.html", $pluginDir);
    
    this.init = function (web) {
        web.Collapsible = function(opt) {
            return new web.Container(template, opt);
        };
    };
};
self.__meta = {
    exports: "web_collapsible"
};