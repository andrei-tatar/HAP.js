var self = module.exports = function(webcontainer, dot, fs, path, __dir) {
    var headerTemplate = dot.template(fs.readFileSync(path.join(__dir, "tabheader.html")));
    var tabControlTemplate = fs.readFileSync(path.join(__dir, "tabcontrol.html"));
    var tabHeadersTemplate = fs.readFileSync(path.join(__dir, "tabheaders.html"));
    var tabPagesTemplate = fs.readFileSync(path.join(__dir, "tabpages.html"));
    
    this.create = function() {
        var tabcontrol = webcontainer.create(tabControlTemplate);
        var tabheaders = webcontainer.create(tabHeadersTemplate);
        tabcontrol.add(tabheaders);
        var tabpages = webcontainer.create(tabPagesTemplate);
        tabcontrol.add(tabpages);
        
        tabcontrol.add = function (child) {
            tabpages.add(child);
            var header = {
                html: function () {
                    return headerTemplate(child);
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
};
self.__meta = {
    exports: "tabcontrol"
};