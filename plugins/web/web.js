var self = module.exports = function(preferences, log, express, watcher, util, components, pluginDir, path) {
    var template = util.lazyTemplate("index.html", pluginDir);
    
    if (!preferences.web) {
        preferences.web = {
            port: 1234
        };
    }

    var compression = require('compression');
    var app = express();
    app.use(compression());
    app.use(express.static(path.join(pluginDir, '.public')));
    
    log.v("Starting web server");
    var http = require('http').Server(app);
    var io = require('socket.io')(http);
    
    http.listen(preferences.web.port, function(){
        log.i('Listening...');
    });
    
    var staticContent = "";
    var headContent = "";
   
    app.get("/", function (req, res) {
        res.send(template.value()({
            staticContent: staticContent,
            headContent: headContent
        }));
    });
    
    var config = [];
    
    io.on('connection', function(socket){
        log.v('user connected - ' + socket.id);
        config.forEach(function (cfg) {
            socket.on(cfg.f, cfg.c);
        });
        socket.on('disconnect', function(){log.v('user disconnected - ' + socket.id);});
    });

    this.app = app;
    this.emit = function (id, data) { io.emit(id, data); };
    this.append = function (content) { staticContent += content; };
    this.appendHead = function (content) { headContent += content; };
    this.on = function (filter, callback) {
        config.push({
            f: filter,
            c: callback
        });
    };
    
    components.sort(function(a,b){return (a.order||0)-(b.order||0);});
    for (var i=0; i<components.length; i++)
        components[i].init(this);
};
self.__meta = {
    imports: ["preferences", "log", "express", "watcher", "util", ":web_.+", "$pluginDir"],
    exports: "web"
};