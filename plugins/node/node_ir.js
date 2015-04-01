var self = module.exports = function(decoders, log, util) {

    decoders.forEach(function (d) {
       log.v("[NODE_IR]Using " + d.__exports);
    });

    function send_code(code) {
        for (var i=0; i<decoders.length; i++) {
            var pulses = decoders[i].encode(code);
            if (pulses) {
                //TODO: format the pulses
                this.get('/ir/'+pulses);
                return;
            }
        }
    };

    this.init = function (node) {
        node.app.post('/ir', function(req, res) {
            var couldNotDecode = true;
            for (var i=0; i<decoders.length; i++) {
                var decoded = decoders[i].decode(req.body.pulses);
                if (decoded) {
                    couldNotDecode = false;

                    var device = node.device(req.body.id);
                    if (device) {
                        if (device.init_ir) {
                            device.init_ir = true;
                            util.createProperty(device, 'ir', decoded);
                        }
                        else
                            device.ir = decoded;
                    }

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