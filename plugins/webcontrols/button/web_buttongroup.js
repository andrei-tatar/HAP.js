module.exports = function(util, $pluginDir) {
    var template = new util.LazyTemplate('button_group.html', $pluginDir);

    this.init = function (web) {
        web.ButtonGroup = function(opt) {
            var container = new web.Container(template);
            util.copyProperties(container, opt);
            return container;
        };
    };
};