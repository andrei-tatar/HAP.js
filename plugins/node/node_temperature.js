module.exports = function(util, log) {
    this.init = function (node) {
        node.app.post('/temperature', function (req, res) {
            var device = node.device(req.body.id);
            if (device) {
                device.temperature = req.body.temperature;
                device.emit('temperature', req.body.temperature);
            }
            res.send("OK");
        });
    };
};