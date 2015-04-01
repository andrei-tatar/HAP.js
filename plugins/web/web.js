var self = module.exports = function(components, preferences, log, watcher, util, $pluginDir) {
    var template = new util.LazyTemplate("index.html", $pluginDir);
    
    if (!preferences.web) {
        preferences.web = {
            port: 1234,
            users: {
                "admin": {id: 0, password: "admin", candelete: "false", group: "admins"},
                "guest": {id: 1, password: "", candelete: "false", group: "guest"}
            }
        };
    }

    var express = require('express'),
        compression = require('compression'),
        session = require('express-session'),
        bodyParser = require('body-parser'),
        passport = require('passport'),
        LocalStrategy = require('passport-local').Strategy,
        app = express(),
        http = require('http'),
        path = require("path"),
        socketio = require('socket.io');

    passport.serializeUser(function(user, done) { done(null, user.id); });
    passport.deserializeUser(function(id, done) {
        for (var userName in preferences.web.users) {
            var user = preferences.web.users[userName];
            if (user.id == id)
                return done(null, user);
        }

        done(new Error('User ' + id + ' does not exist'), null);
    });

    passport.use('login', new LocalStrategy(
        function(username, password, done) {
            var user = preferences.web.users[username];
            if (!user)
                return done(null, false, { message: 'Incorrect username.' });
            if (user.password != password)
                return done(null, false, { message: 'Incorrect password.' });
            return done(null, user);
        }));    


    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({extended: true})); 
    app.use(compression());
    app.use(session({
        secret: "some secret string?",
        resave: true,
        saveUninitialized: false
    }));
    app.use(passport.initialize());
    app.use(passport.session());
    app.use(express.static(path.join($pluginDir, '.public')));
    app.post('/login', passport.authenticate('login', { 
        successRedirect: '/', 
        failureRedirect: '/login', 
        failureFlash: true 
    }));
    
    log.v("Starting web server");
    var http = http.Server(app);
    var io = socketio(http);

    http.listen(preferences.web.port, function(){
        log.i('[WEB]Listening...');
    });
    
    var staticContent = "";
    var headContent = "";
   
    app.get("/", function (req, res) {
        res.send(template.value({
            staticContent: staticContent,
            headContent: headContent
        }));
    });
    
    var config = [];
    
    io.on('connection', function(socket){
        //log.v('user connected - ' + socket.id);
        config.forEach(function (cfg) {
            socket.on(cfg.f, cfg.c);
        });
        //socket.on('disconnect', function(){log.v('user disconnected - ' + socket.id);});
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
    
    var web = this;
    components.forEach(function (component) {
        log.i("[WEB]Initializing " + component.__exports);
        component.init(web);
    });
};
self.__meta = {
    imports: ':web_.+'
};