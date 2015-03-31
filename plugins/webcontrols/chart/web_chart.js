module.exports = function(util, $pluginDir, express) {
    var template = new util.LazyTemplate("chart.html", $pluginDir);
    
    this.init = function (web) {
        web.Chart = function(opt) {
            opt = opt || {};
            
            this.order = opt.order;
            this.html = function () {
                return template.value(this);
            };
        };
        
        require("util").inherits(web.Chart, require("events").EventEmitter);
        
        web.app.get("/chart/:id", function (req, res) {
            console.log(req.params.id);
        });
        
        web.app.use(express.static(require("path").join($pluginDir, '.static')));
        web.append("<script src='js/chart.min.js'></script>");
        web.append("<script src='js/chart.js'></script>");
    };
};