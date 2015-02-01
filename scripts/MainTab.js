var self = module.exports = function(web, log) {
    var control = new web.TabControl();
    web.root.add("<h2>Home</h2>");
    web.root.css.margin = "0 10px 0 10px";
    web.root.add(control);
    
    return control;
};
self.__meta = {
    exports: "MainTab"
};