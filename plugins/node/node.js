var self = module.exports = function(log, express, preferences, $pluginDir, fs) {
    if (!preferences.node) {
        preferences.node = {
            port: 5111
        };
    }
    
    var bodyParser = require('body-parser');
    var app = express();
    app.use(bodyParser.json()); 
  
    app.listen(preferences.node.port, function () {
        log.i("[HAP Node]Listening...");
    });
    
    app.post('/temperature', function(req, res) {
        console.log(req.body);
        res.send("OK");
    });
    
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
        dirs.sort(function (a,b) {
            return parseFloat(b) - parseFloat(a);
        });
        return dirs.first();
    };
    
    var getClientAddress = function (req) {
        return (req.headers['x-forwarded-for'] || '').split(',')[0] || req.connection.remoteAddress;
    };
    
    app.get("/update/latest/:type", function (req, res) {
        log.v(getClientAddress(req) + " asked what is latest version for " + req.params.type);
        var latest = getLatestVersion(req.params.type);
        if (latest)
            res.send(latest);
        else
            res.status(404).send("Not Found");
    });
    
    app.get("/update/get/:type/:num", function (req, res) {
        log.v(getClientAddress(req) + " requested latest version for " + req.params.type);
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
};
self.__meta = {
    exports: "node"
};