var self = module.exports = function(webcontainer, fs, path, __dir) {
    var tabPageTemplate = fs.readFileSync(path.join(__dir, "tabpage.html"));
    
    this.create = function (opt) {
        var page = webcontainer.create(tabPageTemplate);
        page.title = opt.title;
        return page;
    };
};
self.__meta = {
    exports: "tabpage"
};
