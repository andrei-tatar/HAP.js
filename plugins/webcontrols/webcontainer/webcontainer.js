var self = module.exports = function(web, dot, fs, path, __dir) {
    var sf = dot.template(fs.readFileSync(path.join(__dir, "webcontainer.jst")));
    var dt = fs.readFileSync(path.join(__dir, "webcontainer.html"));
    
    var containers = [];
    var idutil = 0;

    var map = function (child) {
        return {
            id: child.id,
            order: child.order
        };
    };
    
    this.find = function (id) {
        for (var i=0; i<containers.length; i++) {
            var item = containers[i].items[id];
            if (item) return item;
        }
        
        return undefined;
    };
    
    this.create = function(template) {
        var tf = dot.template(template || dt);
        
        var container = {
            items: {},
            attrib: function () { return "data-cid='" + container.id + "'"; },
            html: function () { return tf(container) + sf(container); },
            onremove: function () {
                var index = containers.indexOf(container);
                if (index > -1)
                    containers.splice(index, 1);
            },
            add: function (child) {
                if (typeof child === "string") {
                    var aux = child;
                    child = { html: function() { return aux; } };
                } else if (typeof child.html === "string") {
                    var aux = child.html;
                    child.html = function() { return aux; };
                }
                if (!child.order) child.order = 0;
                
                var id = idutil++;
                child.id = id;
                child.parent = container;
                container.items[id] = child;
                var reduced = map(child);
                web.emit("container update " + container.id, reduced);
                
                return {
                    refresh: function() {
                        web.emit("container update " + container.id, reduced);
                    },
                    
                    remove: function() {
                        delete container.items[id];
                        delete child.parent;
                        if (child.onremove) child.onremove();
                        web.emit("container remove", id);
                    }
                };
            },
        };
        
        containers.push(container);
        return container;
    };
    
    web.app.get("/container/items/:id", function (req, res) {
        for (var i=0; i<containers.length; i++) {
            var c = containers[i];
            if (c.id == req.params.id) {
                var m = [];
                for (var key in c.items) {
                    m.push({
                        id: key,
                        order: c.items[key].order
                    });
                }
                res.send(m);
                return;
            }
        }
        
        res.send([]);
    });
    
    web.app.get("/container/render/:id/:subid", function (req, res) {
        for (var i=0; i<containers.length; i++) {
            var c = containers[i];
            if (c.id == req.params.id) {
                var child = c.items[req.params.subid];
                if (child) {
                    res.send(child.html());
                    return;
                }
            }
        }
        
        res.send("Child not found!");
    });
    
    var root = this.create();
    root.id = idutil++;
    
    this.root = root;
    web.append(fs.readFileSync(path.join(__dir, "static.jst")));
    web.app.get("/rootcontainer", function (req, res) {
        res.send(root.html());
    });
};
self.__meta = {
    exports: "webcontainer"
};