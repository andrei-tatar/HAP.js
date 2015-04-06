module.exports = function (log) {
    function reset(callback) {
        this.get("/reset", function (statusCode, body) {
            if (callback) {
                var success = statusCode == 200;
                callback(success);
            }
        });
    }

    function upgrade(callback) {
        this.get("/upgrade", function (statusCode, body) {
            if (callback) {
                var success = statusCode == 200;
                callback(success);
            }
        });
    }

    this.init = function (node) {
        node.on('device_discovered', function (device) {
            device.reset = reset.bind(device);
            device.upgrade = upgrade.bind(device);
        });
    };
};