var self = module.exports = function(util, dot, $pluginDir) {
    var defaultTemplate = util.lazyTemplate("container.html", $pluginDir);
    var defaultScriptTemplate = util.lazyTemplate("container.script.html", $pluginDir);
    
    var containers = [];
    var idutil = 0;

    var simplifyContainerChild = function (child) {
        return {
            id: child.id,
            order: child.order
        };
    };
    
    var getTemplateGenerator = function(tmp, lazydefault) {
        if (tmp) {
            if (util.isFunction(tmp)) return { value: tmp };
            if (tmp.value && util.isFunction(tmp.value)) return tmp;
            return util.lazy(function(){return dot.template(tmp);});
        }
        return lazydefault;
    };
    
    this.order = -1;
    
    this.init = function (web) {
        web.findControl = function (id) {
            for (var i=0; i<containers.length; i++) {
                var item = containers[i].items.find(function(it){return it.id==id;});
                if (item) return item;
            }
            
            return undefined;
        };
        
        web.Container = function(template, scriptTemplate) {
            var tf = getTemplateGenerator(template, defaultTemplate);
            var sf = getTemplateGenerator(scriptTemplate, defaultScriptTemplate);
            
            var container = {
                items: [],
                attrib: function () { return "data-cid='" + container.id + "'"; },
                html: function () { return tf.value()(container) + sf.value()(container); },
                onremove: function () {
                    var index = containers.indexOf(container);
                    if (index > -1)
                        containers.splice(index, 1);
                },
                add: function (child) {
                    if (child.parent)
                        throw "Child already has a parent";
                    
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
                    container.items.push(child);
                    var simplified = simplifyContainerChild(child);
                    web.emit("ct_upd", {id: container.id, attrib: container.attrib(), child: simplified});
                    
                    child.refresh = function() {
                        web.emit("ct_upd", {id: container.id, attrib: container.attrib(), child: simplified});
                    };
                        
                    child.remove = function() {
                        if (child.onremove) child.onremove();
                        
                        container.items.remove(child);
                        delete child.parent;
                        delete child.remove;
                        delete child.refresh;
                        
                        web.emit("ct_rm", id);
                    };
                },
            };
            
            containers.push(container);
            return container;
        };

        web.app.get("/container/items/:id", function (req, res) {
            var cid = req.params.id;
            for (var i=0; i<containers.length; i++) {
                var c = containers[i];
                if (c.id == cid) {
                    res.send(c.items.map(simplifyContainerChild));
                    return;
                }
            }
            
            res.send([]);
        });
        
        web.app.get("/container/render/:id/:subid", function (req, res) {
            for (var i=0; i<containers.length; i++) {
                var c = containers[i];
                if (c.id == req.params.id) {
                    var child = c.items.find(function(c){return c.id==req.params.subid;});
                    if (child) {
                        res.send(child.html());
                        return;
                    }
                }
            }
            
            res.send("Child not found!");
        });
        
        web.root = new web.Container();
        web.root.id = idutil++;
        web.append(util.readFile("container.static.html", $pluginDir));
        web.app.get("/rootcontainer", function (req, res) {
            res.send(web.root.html());
        });
    };
};
self.__meta = {
    exports: "web_container"
};