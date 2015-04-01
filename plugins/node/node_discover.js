module.exports = function (preferences, log) {
    this.order = -1;

    var dgram = require("dgram"),
        os = require('os'),
        ip = require('ip');

    this.init = function(node) {
        var broadcast = [];
        var interfaces = os.networkInterfaces();
        for (var key in interfaces) {
            var addresses = interfaces[key];

            addresses.forEach(function (address) {
                if (address.internal || address.family != 'IPv4') return;
                var subnet = ip.subnet(address.address, address.netmask);
                var broadcastAddress = subnet.broadcastAddress;
                broadcast.push(broadcastAddress);
            });
        }

        //no network interfaces?
        if (broadcast.length == 0)
            return;

        log.v("Using broadcast address(es) : " + broadcast);

        var message = new Buffer("ID");
        var socket = dgram.createSocket("udp4");
        socket.bind();
        socket.on("listening", function () {
            socket.setBroadcast(true);

            var send = function() {
                broadcast.forEach(function (broadcastAddress) {
                    socket.send(message, 0, message.length, preferences.node.udpPort, broadcastAddress);
                });
                setTimeout(send, 15000);
            };

            send();
        });

        socket.on('message', function(msg, rinfo) {
            var parts = new Buffer(msg).toString().split(':');
            if (parts.length == 3) {
                var id = parseInt(parts[0]);
                var name = parts[1];
                var type = parts[2];
                var address = rinfo.address;

                preferences.node.deviceMap[id] = name;
                var device = node.device(id);

                if (device.address != address || device.type != type ||
                    device.available != true || device.name != name) {
                    device.address = address;
                    device.type = type;
                    device.name = name;
                    node.emit('device_discovered', device);

                    device.available = true;
                }
            }
        });
    };
};