var self = module.exports = function(web, log) {
    var control = new web.TabControl();

    var top = new web.Container();
    web.root.add(top);
    top.css.display = 'inline-block';
    top.add("<h2 style='float:left'>Home</h2>");

    control.TopRight = new web.Container();
    top.add(control.TopRight);
    
    control.TopRight.css.float = "right";
    control.TopRight.add("Test");
    
    web.root.css.margin = "0 10px 0 10px";
    web.root.add(control);
    
    return control;
};
self.__meta = {
    exports: "MainTab"
};