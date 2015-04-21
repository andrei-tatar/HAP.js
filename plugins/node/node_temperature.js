module.exports = function() {
    this.init = function (node) {
        node.subscribe("/hap/temperature", function (device, message) {
            device.temperature = parseFloat(message);
        });
    };
};