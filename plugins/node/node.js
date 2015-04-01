var self = module.exports = function(plugins, log, preferences, $pluginDir, util) {
    if (!preferences.node) {
        preferences.node = {
            port: 5111,
            udpPort: 5112,
            deviceMap: { }
        };
    }
    
    var bodyParser = require('body-parser'),
        path = require('path'),
        request = require('request'),
        events = require('events'),
        nodeUtil = require("util"),
        fs = require('fs'),
        express = require('express');

    var app = express();
    app.use(bodyParser.json()); 

    app.listen(preferences.node.port, function () {
        log.i("[HAP Node]Listening...");
    });

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

    var devices = { }; //devices are lazy created

    var NodeDevice = function (id) {
        this.id = id;
        this.address = '';
        this.type = '';
        this.available = false;

        this.get = function(path, complete) {
            request('http://'+ this.address + path, complete);
        };
    };

    nodeUtil.inherits(NodeDevice, events.EventEmitter);
    var events = new events.EventEmitter();
    this.on = events.on;
    this.emit = events.emit;

    this.app = app;
    this.device = function (idOrName) {
        var id;
        if (typeof idOrName === "string") {
            //we have a name
            for (var key in preferences.node.deviceMap) {
                if (preferences.node.deviceMap[key].toUpperCase() === idOrName.toUpperCase()) {
                    id = key;
                    break;
                }
            }
        }
        else
            id = idOrName;

        if (typeof id === "undefined")
            return undefined;

        var device = devices[id];
        if (!device) {
            device = new NodeDevice(id);
            util.createProperty(device, 'available');
            devices[id] = device;
        }

        return device;
    };

    var node = this;
    plugins.sort(function(a,b){return (a.order||0)-(b.order||0);});
    plugins.forEach(function (plugin) {
        log.i("Initializing " + plugin.__exports);
        plugin.init(node);
    });
};
self.__meta = {
    imports: ':node_.+'
};