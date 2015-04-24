module.exports = function($pluginDir, preferences, log) {
    var upgradeTopic = '/hap/upgrade/';

    if (!preferences.node) preferences.node = {};
    if (!preferences.node.upgradePort) preferences.node.upgradePort = 5113;

    var express = require('express'),
        path = require('path'),
        fs = require('fs');

    var app = express();
    app.listen(preferences.node.upgradePort, function () {
        log.i("[NODE_U]Listening...");
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

    app.get("/:type/:num", function (req, res) {
        log.v('[NODE_U]' + req.connection.remoteAddress + " requested latest version for " + req.params.type);
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

    this.init = function(node) {
        node.on('subscribed', function(device, topic) {
            if (topic.indexOf(upgradeTopic) === 0) {
                var nodeType = topic.substr('/hap/upgrade/'.length);

                var latestVersion = getLatestVersion(nodeType);
                var serverPort = preferences.node.upgradePort.toString();
                var path = '/' + nodeType + '/';

                var message = new Buffer(latestVersion.length + serverPort.length + path.length + 3);
                var offset = message.write(latestVersion);message[offset++] = 0;
                offset += message.write(serverPort, offset);message[offset++] = 0;
                offset += message.write(path, offset);message[offset] = 0;

                device.publish('/hap/upgrade/' + nodeType, message);
            }
        });
    };
};