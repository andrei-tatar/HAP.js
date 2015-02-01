var self = module.exports = function(MainTab, web, log) {
    var page = new web.TabPage({title: "Charts", order: 1});
    MainTab.add(page);

    var chart = new web.Chart();
    page.add(chart);
};