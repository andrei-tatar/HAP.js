var self = module.exports = function(util, $pluginDir, path, express) {
    var template = util.lazyTemplate("chart.html", $pluginDir);
    
    this.init = function (web) {
        web.Chart = function(chart) {
            chart = chart || {};
            chart.html = function () {
                return template.value()(chart);
            };
            return chart;
        };
        
        web.app.get("/chart/:id", function (req, res) {
            console.log(req.params.id);
        });
        
        web.app.use(express.static(path.join($pluginDir, '.static')));
        web.append("<script src='js/chart.min.js'></script>");
        web.append("<script src='js/chart.js'></script>");
    };
};
self.__meta = {
    exports: "web_chart"
};