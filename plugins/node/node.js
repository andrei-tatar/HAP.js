var self = module.exports = function(log, express, preferences, $pluginDir, fs, plugins) {
    if (!preferences.node) {
        preferences.node = {
            port: 5111,
            devices: []
        };
    }
    
    var bodyParser = require('body-parser');
    var app = express();
    app.use(bodyParser.json()); 

    app.listen(preferences.node.port, function () {
        log.i("[HAP Node]Listening...");
    });

    var fs = require('fs');
    var path = require('path');
    
    var getLatestVersion = function(type) {
        var dir = path.join($pluginDir, "fw", type);
        if (!fs.existsSync(dir))
            return undefined;
        var dirs = fs.readdirSync(dir).filter(function(file) {
            return fs.statSync(path.join(dir, file)).isDirectory();
        });
        if (dirs.length == 0)
            return undefined;
        dirs.sort(function (a, b) {
            return parseFloat(b) - parseFloat(a);
        });
        return dirs.first();
    };

    app.get("/update/latest/:type", function (req, res) {
        var latest = getLatestVersion(req.params.type);
        if (latest)
            res.send(latest);
        else
            res.status(404).send("Not Found");
    });
    
    app.get("/update/get/:type/:num", function (req, res) {
        log.v(req.connection.remoteAddress + " requested latest version for " + req.params.type);
        var fwDir = path.join($pluginDir, "fw", req.params.type);
        var latest = getLatestVersion(req.params.type);
        if (latest) {
            var filePath = path.join(fwDir, latest, req.params.num);
            if (fs.existsSync(filePath)) {
                res.sendFile(filePath);
                return;
            }
        }
        res.status(404).send("Not Found");
    });

    this.app = app;
    var node = this;
    plugins.forEach(function (plugin) {
        log.i("Initializing " + plugin.__exports);
        plugin.init(node);
    });
};
self.__meta = {
    imports: ['log', 'express', 'preferences', '$pluginDir', 'fs', ':node_.+']
};