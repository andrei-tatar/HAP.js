var self = module.exports = function(util, $pluginDir) {
    var headerTemplate = util.lazyTemplate("tabheader.html", $pluginDir); 
    var tabControlTemplate = util.lazyTemplate("tabcontrol.html", $pluginDir);
    var tabHeadersTemplate = util.lazyTemplate("tabheaders.html", $pluginDir);
    var tabPagesTemplate = util.lazyTemplate("tabpages.html", $pluginDir);
    
    this.init = function(web) {
        web.TabControl = function(opt) {
            opt = opt || {};
            
            var tabcontrol = new web.Container(tabControlTemplate);
            tabcontrol.order = opt.order;
            
            var tabheaders = new web.Container(tabHeadersTemplate);
            tabcontrol.add(tabheaders);
            var tabpages = new web.Container(tabPagesTemplate);
            tabcontrol.add(tabpages);
            
            tabcontrol.add = function (child) {
                tabpages.add(child);
                var header = {
                    order: child.order,
                    html: function () {
                        return headerTemplate.value()(child);
                    }
                };
                tabheaders.add(header);
                
                var oldrefresh = child.refresh;
                child.refresh = function () {
                    oldrefresh();
                    header.refresh();
                };
                
                var oldremove = child.remove;
                child.remove = function () {
                    oldremove();
                    header.remove();
                };
            };
            
            return tabcontrol;
        };
    }
};
self.__meta = {
    exports: "web_tabcontrol"
};