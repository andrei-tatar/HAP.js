var self = module.exports = function(decoders, log, util) {

    decoders.forEach(function (d) {
       log.v("[NODE_IR]Using " + d.__exports);
    });

    function send_code(code, callback) {
        for (var i=0; i<decoders.length; i++) {
            var pulses = decoders[i].encode(code);
            if (pulses) {
                this.post('/ir', pulses, function (statusCode, body) {
                    if (callback) {
                        var success = statusCode == 200 && body == 'OK';
                        callback(success);
                    }
                });
                return true;
            }
        }

        return false;
    }

    this.init = function (node) {
        node.app.post('/ir', function(req, res) {
            for (var i=0; i<decoders.length; i++) {
                var decoded = decoders[i].decode(req.body.pulses);
                if (decoded) {
                    var device = node.device(req.body.id);
                    if (device) device.emit('ir', decoded);
                    break;
                }
            }

            res.send("OK");
        });

        node.on('device_discovered', function (device) {
            if (device.type != 'hap_ir') return;
            device.send_ir = send_code.bind(device);
        });
    };
};
self.__meta = {
    imports: ':ir_.+'
};