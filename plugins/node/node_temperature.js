module.exports = function(util, log) {
    this.init = function (node) {
        node.app.post('/temperature', function (req, res) {
            var device = node.device(req.body.id);
            if (device) {
                if (!device.init_temperature) {
                    device.init_temperature = true;
                    util.createProperty(device, 'temperature', req.body.temperature);
                }
                else
                    device.temperature = req.body.temperature;
            }
            res.send("OK");
        });
    };
};