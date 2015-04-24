var self = module.exports = function(plugins, log, preferences, $pluginDir, util) {
    if (!preferences.node) preferences.node = {};
    if (!preferences.node.port) preferences.node.port = 5111;
    if (!preferences.node.udpPort) preferences.node.udpPort = 5112;
    if (!preferences.node.serverName) preferences.node.serverName = 'hap_server';
    if (!preferences.node.user) preferences.node.user = 'user';
    if (!preferences.node.password) preferences.node.password = 'pass';
    
    var path = require('path'),
        events = require('events'),
        nodeUtil = require("util"),
        fs = require('fs'),
        mosca = require('mosca');

    var server = new mosca.Server({
        port: preferences.node.port
    });

    server.on('ready', function () {
        server.authenticate = function(client, username, password, callback) {
            var authorized =
                username === preferences.node.user &&
                password.toString() === preferences.node.password;
            callback(null, authorized);
        };
        server.authorizePublish = function(client, topic, payload, callback) {
            callback(null, true); //allow all to publish
        };
        server.authorizeSubscribe = function(client, topic, callback) {
            callback(null, true); //allow all to subscribe
        };
        log.i('[NODE]Mosca server is up and running');
    });

    this.subscribe = function(topic, callback) {
        server.on('published', function(packet, client) {
            if (client && client.id && packet.topic === topic)
                callback(device(client.id), packet.payload);
        });
    };

    function NodeDevice(name) {
        util.createReadOnlyProperty(this, 'name', name);

        this.publish = function (topic, payload, onSent, opt) {
            opt = opt || {};
            if (typeof opt.qos != 'number') opt.qos = 0;
            if (typeof opt.retain != "boolean") opt.retain = false;

            var message = {
                topic: topic,
                payload: payload,
                qos: opt.qos,
                retain: opt.retain
            };

            server.publish(message, onSent);
        }
    }

    nodeUtil.inherits(NodeDevice, events.EventEmitter);

    var devices = {};
    var device = function (name) {
        var device = devices[name];
        if (!device) {
            device = new NodeDevice(name);
            devices[name] = device;
        }
        return device;
    };
    this.device = device;

    var nodeEvents = new events.EventEmitter();
    this.on = nodeEvents.on.bind(nodeEvents);
    this.emit = nodeEvents.emit.bind(nodeEvents);

    server.on('clientConnected', function(client) {
        log.v('[NODE]Device connected: ' + client.id);
        var dev = device(client.id);
        nodeEvents.emit('connected', dev);
        dev.emit('connected');
    });

    server.on('clientDisconnecting', function(client) {
        log.v('[NODE]Device disconnecting: ' + client.id);
        var dev = device(client.id);
        nodeEvents.emit('disconnecting', v);
        dev.emit('disconnecting');
    });

    server.on('clientDisconnected', function(client) {
        log.v('[NODE]Device disconnected: ' + client.id);
        var dev = device(client.id);
        nodeEvents.emit('disconnected', dev);
        dev.emit('disconnected');
    });

    server.on('subscribed', function(topic, client) {
        log.v('[NODE]Device subscribed to ' + topic + ': ' + client.id);
        var dev = device(client.id);
        nodeEvents.emit('subscribed', dev, topic);
    });

    // fired when a client subscribes to a topic
    server.on('unsubscribed', function(topic, client) {
        log.v('[NODE]Device unsubscribed from ' + topic + ': ' + client.id);
    });

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