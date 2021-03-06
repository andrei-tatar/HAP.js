module.exports = function(util, $pluginDir) {
    var defaultTemplate = new util.LazyTemplate("container.html", $pluginDir);
    var scriptTemplate = new util.LazyTemplate("container.script.html", $pluginDir);
    
    var containers = [];
    var idutil = 0;
    var nodeUtil = require("util"),
        path = require("path"),
        express = require('express'),
        events = require('events');

    var simplifyContainerChild = function (child) {
        return {
            id: child.id,
            order: child.order
        };
    };
    
    var getstyle = function(css) {
        var ret = "";
        for (var key in css) {
            var value = css[key];
            if (value)
                ret += key+":"+value+";";
        }
        if (ret.length > 0)
            ret = "style=\""+ret+"\"";
        return ret;
    };
    
    this.order = -1000;
    
    this.init = function (web) {
        web.findControl = function (id, req) {
            for (var i=0; i<containers.length; i++) {
                var item = containers[i].filterItems(req).first(function(it){return it.id==id;});
                if (item) return item;
            }
            
            return undefined;
        };
        
        web.Container = function(template) {
            var tf = template || defaultTemplate;
            var container = this;
            var containeritems = [];
            container.attrib = function () { return "data-cid='" + container.id + "'"; };
            container.html = function (req) { 
                return tf.value(container) + scriptTemplate.value({
                    container: container, request: req
                }); 
            };
            container.on("remove", function () {
                var index = containers.indexOf(this);
                if (index > -1) containers.splice(index, 1);
            });
            container.on("added", function () {
                containers.push(this);
            });
            container.filterItems = function (req) {
                return containeritems;
            };
            container.add = function (child) {
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
                
                child.id = idutil++;
                child.parent = container;
                containeritems.push(child);
                var simplified = simplifyContainerChild(child);
                child.refresh = function() {
                    web.emit("ct_upd", {attrib: container.attrib(), child: simplified});
                };
                if (!child.css) child.css = {};
                child.getstyle = getstyle.bind(this, child.css);
                    
                child.remove = function() {
                    if (child.emit) child.emit("remove");

                    containeritems.remove(child);
                    delete child.parent;
                    delete child.remove;
                    delete child.refresh;
                    
                    web.emit("ct_rm", child.id);
                };

                web.emit("ct_upd", {attrib: container.attrib(), child: simplified});
                if (child.emit) child.emit("added");
                return child;
            };
        };
        
        nodeUtil.inherits(web.Container, events.EventEmitter);

        web.app.get("/container/render/:id", function (req, res) {
            var child = web.findControl(req.params.id, req);
            if (child) {
                res.send(child.html(req));
                return;
            }
            res.status(404).send('Not found');
        });
        
        web.root = new web.Container();
        web.root.css = {};
        web.root.getstyle = getstyle.bind(this, web.root.css);
        web.root.id = idutil++;
        web.app.use(express.static(path.join($pluginDir, '.static')));
        web.append("<script src='js/container.js'></script>");
        
        web.app.get("/rootcontainer", function (req, res) {
            res.send(web.root.html(req));
        });
    };
};