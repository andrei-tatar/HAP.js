var self = module.exports = function(decoders, log) {

    this.init = function (node) {
        node.app.post('/ir', function(req, res) {
            for (var i=0; i<decoders.length; i++) {
                var decoded = decoders[i].decode(req.body.pulses);
                if (decoded) {
                    log.v("IR: " + decoded);
                    break;
                }
            }

            res.send("OK");
        });
    };
};
self.__meta = {
    imports: ':ir_.+'
};