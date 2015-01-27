var self = module.exports = function(util, dot, $pluginDir, path, express) {
    var template = util.lazyTemplate("slider.html", $pluginDir);
    
    this.init = function (web) {
        web.Slider = function (slider) {
            slider = slider || {};
            slider.html = function () {
                return template.value()(slider);
            };
            return slider;
        };
        
        web.app.use(express.static(path.join($pluginDir, '.static')));
        web.append("<script src='js/bootstrap-slider.min.js'></script>");
        web.appendHead("<link rel='stylesheet' href='css/bootstrap-slider.min.css'>");
    };
};
self.__meta = {
    exports: "web_slider"
};