var self = module.exports = function(plugins, log, preferences, $pluginDir, util) {
    if (!preferences.node) {
        preferences.node = {
            port: 5111,
            udpPort: 5112
        };
    }
    
    var bodyParser = require('body-parser'),
        path = require('path'),
        events = require('events'),
        nodeUtil = require("util"),
        fs = require('fs'),
        express = require('express'),
        http = require('http');

    var app = express();
    app.use(bodyParser.json()); 

    app.listen(preferences.node.port, function () {
        log.i("[NODE]Listening...");
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

    var devices = []; //devices are lazy created

    this.NodeDevice = function (id, name, address, type) {
        util.createReadOnlyProperty(this, 'id', id);
        util.createReadOnlyProperty(this, 'address', address);
        util.createReadOnlyProperty(this, 'type', type);
        util.createReadOnlyProperty(this, 'name', name);
        util.createProperty(this, 'available', false);

        var agent = new http.Agent({
            maxSockets: 1,
            keepAlive: true
        });

        this.request = function (method, path, data, callback) {
            var options = {
                hostname: this.address,
                method: method,
                path: path,
                agent: agent
            };

            if (data) {
                options.headers = {
                    'Content-Type': 'application/json',
                    'Content-Length': data.length
                };
            }

            var req = http.request(options, function(res) {
                var body = '';

                res.on('data', function (chunk) {
                    body += chunk;
                });

                res.on('end', function () {
                    callback(res.statusCode, body);
                });
            });

            req.on('socket', function (socket) {
                socket.setTimeout(1500);
                socket.on('timeout', function() {
                    req.abort();
                });
            });

            req.on('error', function(err) {
                if (err.code === "ECONNRESET") {
                    callback(false);
                }
            });

            if (data) req.write(data);
            req.end();
        };

        this.get = function(path, complete) {
            this.request('GET', path, undefined, complete);
        };

        this.post = function(path, data, complete) {
            this.request('POST', path, JSON.stringify(data), complete);
        };
    };

    nodeUtil.inherits(this.NodeDevice, events.EventEmitter);
    var events = new events.EventEmitter();
    this.on = events.on.bind(events);
    this.emit = events.emit.bind(events);

    this.app = app;
    this.device = function (idOrName, onadd) {
        var device = devices.first(function (d) {
            return d.id == idOrName || d.name == idOrName;
        });

        if (util.isFunction(onadd)) {
            if (device)
                onadd(device);
            else
                events.on('device_add_'+idOrName, onadd);
        }

        return device;
    };

    this.addDevice = function (device) {
        devices.push(device);
        events.emit('device_add_'+device.id, device);
        events.emit('device_add_'+device.name, device);
        events.emit('device_add', device);
    };

    var node = this;
    plugins.sort(function(a,b){return (a.order||0)-(b.order||0);});
    plugins.forEach(function (plugin) {
        log.i("[NODE]Initializing " + plugin.__exports);
        plugin.init(node);
    });
};
self.__meta = {
    imports: ':node_.+'
};