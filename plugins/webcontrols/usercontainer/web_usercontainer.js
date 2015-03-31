module.exports = function(catalog, preferences, express) {
    this.init = function (web) {
        web.app.get('/login', function (req, res) {
            res.send('<form action="/login" method="post"><div><label>Username:</label><input type="text" name="username"/><br/>'+
                     '</div><div><label>Password:</label><input type="password" name="password"/></div><div>'+
                     '<input type="submit" value="Submit"/></div>');
        });
        
        web.UserContainer = function (opt, template) {
            opt = opt || {};
            var container = new web.Container(template);
            container.css = opt.css;
            container.order = opt.order;
            
            var oldfilter = container.filterItems;
            container.filterItems = function (req) {
                if (!req) return oldfilter(req);
                
                var userGroup = req ? (req.user ? req.user.group : "guest") : "guest";
                return oldfilter(req).filter(function (item) {
                    return userGroup.match(item.userGroupFilter);
                });
            };
            
            var oldAdd = container.add;
            container.add = function (child, filter) {
                var added = oldAdd(child);
                added.userGroupFilter = new RegExp("^" + (filter || ".*") + "$");
                return added;
            };
            
            return container;
        };
    };
};