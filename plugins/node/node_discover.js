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

                var message = new Buffer(6 + address.address.length);
                message.write("HAP");
                message.writeUInt16BE(preferences.node.port, 3);
                message.write(address.address, 5);
                message[message.length - 1] = 0;

                broadcast.push({
                    address: subnet.broadcastAddress,
                    message: message
                });
            });
        }

        //no network interfaces?
        if (broadcast.length == 0)
            return;

        log.v("Using broadcast address(es) : " + broadcast.map(function(p){return p.address;}));

        var socket = dgram.createSocket("udp4");
        socket.bind();
        socket.on("listening", function () {
            socket.setBroadcast(true);

            var send = function() {
                broadcast.forEach(function (pair) {
                    socket.send(pair.message, 0, pair.message.length, preferences.node.udpPort, pair.address);
                });
                setTimeout(send, 10000);
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