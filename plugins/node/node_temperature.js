module.exports = function($pluginDir) {
    var path = require("path");
    var sqlite3 = require("sqlite3").verbose();
    var db = new sqlite3.Database(path.join($pluginDir, "temperature.db"));

    this.init = function (node) {
        node.app.post('/temperature', function(req, res) {
            var tableName = "Temp" + req.body.id;
            var time = Math.round(Date.now()/1000);
            var value = req.body.temperature;

            db.serialize(function() {
                db.run("begin transaction");
                db.run("create table if not exists " + tableName + " (time INTEGER, value REAL)");
                db.run("insert into " + tableName + " values (?, ?)", [time, value]);
                db.run("commit");
            });

            res.send("OK");
        });
    };
};