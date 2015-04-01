module.exports = function(node, $pluginDir, util, log) {
    var db = new util.Lazy(function() {
        var path = require("path");
        var sqlite3 = require("sqlite3").verbose();
        return new sqlite3.Database(path.join($pluginDir, "temperature.db"));
    });

    var sensor = node.device('temp_birou');

    sensor.on('temperature', function (value) {
        console.log("Temperature : " + value);
        var tableName = "Temp1";
        var time = Math.round(Date.now()/1000);

        db.value.serialize(function() {
            db.value.run("begin transaction");
            db.value.run("create table if not exists " + tableName + " (time INTEGER, value REAL)");
            db.value.run("insert into " + tableName + " values (?, ?)", [time, value]);
            db.value.run("commit");
        });
    });

    node.on('device_discovered', function (device) {
        log.i('[NODE]Discovered id:'+device.id+', name:'+device.name+', type:'+device.type+', addr:'+device.address);

        device.on('available', function(available) {
            device.get('/heap', function (error, response, body) {
                log.i("Heap Size ("+device.name+"):"+body);
            });
        });
    });
};

