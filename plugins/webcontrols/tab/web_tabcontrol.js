module.exports = function(util, $pluginDir) {
    var headerTemplate = new util.LazyTemplate("tabheader.html", $pluginDir);
    var tabControlTemplate = new util.LazyTemplate("tabcontrol.html", $pluginDir);
    var tabHeadersTemplate = new util.LazyTemplate("tabheaders.html", $pluginDir);
    var tabPagesTemplate = new util.LazyTemplate("tabpages.html", $pluginDir);

    var events = require('events'),
        nodeUtil = require('util');

    function TabHeader(child) {
        this.order = child.order;
        this.html = function () {
            return headerTemplate.value(child);
        };
    }
    nodeUtil.inherits(TabHeader, events.EventEmitter);

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
                var added = tabpages.add(child);
                var header = new TabHeader(child);
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
                return added;
            };
            
            return tabcontrol;
        };
    }
};