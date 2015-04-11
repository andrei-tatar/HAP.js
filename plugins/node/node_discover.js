module.exports = function (preferences, log) {
    this.order = -1;

    var dgram = require("dgram"),
        os = require('os'),
        ip = require('ip');

    this.init = function(node) {
        var broadcastAddresses = [];
        var interfaces = os.networkInterfaces();
        for (var key in interfaces) {
            var addresses = interfaces[key];

            addresses.forEach(function (address) {
                if (address.internal || address.family != 'IPv4') return;
                var subnet = ip.subnet(address.address, address.netmask);
                broadcastAddresses.push(subnet.broadcastAddress);
            });
        }

        //no network interfaces?
        if (broadcastAddresses.length == 0)
            return;

        log.v("Using broadcast address(es) : " + broadcastAddresses.map(function(p){return p.address;}));

        var socket = dgram.createSocket("udp4");
        socket.bind();
        socket.on("listening", function () {
            socket.setBroadcast(true);

            var message = new Buffer(6 + preferences.node.serverName.length);
            message.write("HAP");
            message.writeUInt16BE(preferences.node.port, 3);
            message.write(preferences.node.serverName, 5);
            message[message.length - 1] = 0;

            var send = function() {
                broadcastAddresses.forEach(function (address) {
                    socket.send(message, 0, message.length, preferences.node.udpPort, address);
                });
            };

            send();
            setInterval(send, 10000);
        });

        socket.on('message', function(msg, rinfo) {
            var parts = new Buffer(msg).toString().split(':');
            if (parts.length == 3) {
                var id = parseInt(parts[0]);
                var name = parts[1];
                var type = parts[2];
                var address = rinfo.address;

                var device = node.device(id);
                if (!device) {
                    device = new node.NodeDevice(id, name, address, type);
                    node.emit('device_discovered', device);
                    node.addDevice(device);
                }
            }
        });
    };
};