var self = module.exports = function(util, $pluginDir, express) {
    var template = new util.LazyTemplate("notification.html", $pluginDir);
    
    var Notification = function (opt) {
        this.css = { "margin-bottom": "5px" };
        this.html = function() { return template.value(this); };
        this.type = opt.type;
        this.message = opt.message;
        this.title = opt.title;
    };
    
    require("util").inherits(Notification, require("events").EventEmitter);
    
    this.init = function (web) {
        web.Notifier = function(opt) {
            opt = opt || {};
            var notifier = new web.Container();
            notifier.css = opt.css;
            notifier.order = opt.order;
            var oldAdd = notifier.add;
            
            notifier.add = function (m) {
                var notification = new Notification(m);
                notification.dismissible = !(m.dismissible === false);
                if (m.timeout) {
                    setTimeout(function (arg) {
                        if (notification.remove) 
                            notification.remove();
                    }, m.timeout, m);
                }
                
                return oldAdd(notification);
            };
            
            notifier.success = function (not) {
                if (typeof not === "string") not = { message: not };
                not.type = "success";
                not.title = not.title || "Success";
                notifier.add(not);
            };
            
            notifier.info = function (not) {
                if (typeof not === "string") not = { message: not };
                not.type = "info";
                not.title = not.title || "Info";
                notifier.add(not);
            };
            
            notifier.warning = function (not) {
                if (typeof not === "string") not = { message: not };
                not.type = "warning";
                not.title = not.title || "Warning";
                notifier.add(not);
            };
            
            notifier.danger = function (not) {
                if (typeof not === "string") not = { message: not };
                not.type = "danger";
                not.title = not.title || "Danger";
                notifier.add(not);
            };
            
            return notifier;
        };
    }
};
self.__meta = {
    exports: "web_notifier"
};