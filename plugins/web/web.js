var self = module.exports = function(preferences, log, express, watcher, util, components) {
    if (!preferences.web) {
        preferences.web = {
            port: 1234
        };
    }

    var compression = require('compression');
    var app = express();
    app.use(compression());
    app.use(express.static(__dirname + '/.public'));
    
    this.app = app;
    
    log.v("Starting web server");
    
    var http = require('http').Server(app);
    var io = require('socket.io')(http);
    this.emit = function (id, data) {
        io.emit(id, data);
    };
    
    http.listen(preferences.web.port, function(){
        log.i('Listening...');
    });
    
    var staticContent = "";
    
    app.get("/static", function (req, res) {
        res.send(staticContent);
    });
    
    this.append = function (content) {
        staticContent += content;
    };
    
    var config = [];
    this.on = function (filter, callback) {
        config.push({
            f: filter,
            c: callback
        });
    };
    
    io.on('connection', function(socket){
        //log.i('a user connected');
        
        config.forEach(function (cfg) {
            socket.on(cfg.f, cfg.c);
        });
        
        socket.on('disconnect', function(){
            //log.i('user disconnected');
        });
    });
    
    components.sort(function(a,b){return (a.order||0)-(b.order||0);});
    for (var i=0; i<components.length; i++)
        components[i].init(this);
};
self.__meta = {
    imports: ["preferences", "log", "express", "watcher", "util", ":web_.+"],
    exports: "web"
};