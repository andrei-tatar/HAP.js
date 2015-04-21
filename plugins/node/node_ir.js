var self = module.exports = function(decoders, log) {

    decoders.forEach(function (d) {
       log.v("[NODE_IR]Using " + d.__exports);
    });

    function send_code(code, callback) {
        for (var i=0; i<decoders.length; i++) {
            var pulses = decoders[i].encode(code);
            if (pulses) {
                var data = [];
                for (i=0; i<pulses.length; i++) {
                    var pulse = pulses[i];
                    data.push(pulse >> 8);
                    data.push(pulses & 0xFF);
                }

                this.publish('/hap/ir/' + this.name, new Buffer(data), callback);
                return true;
            }
        }

        return false;
    }

    this.init = function (node) {
        node.subscribe("/hap/ir", function (device, message) {
            if (message.length % 2 != 0)
                return;

            var pulses = [], i;
            for (i=0; i<message.length; i+=2) {
                var pulse = (message[i] << 8) | message[i+1];
                pulses.push(pulse);
            }

            for (i=0; i<decoders.length; i++) {
                var decoded = decoders[i].decode(pulses);
                if (decoded) {
                    device.emit('ir', decoded);
                    return;
                }
            }
        });

        node.on('subscribed', function (device, topic) {
            if (topic.indexOf('/hap/ir/') == 0) {
                log.i('[NODE_IR]Device configured: ' + device.name);
                device.send_ir = send_code.bind(device);
            }
        });
    };
};
self.__meta = {
    imports: ':ir_.+'
};