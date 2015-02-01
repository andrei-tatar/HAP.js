var self = module.exports = function(MainTab, web, log) {
    var page = new web.TabPage({title: "Sliders"});
    MainTab.add(page);

    var s1 = new web.Slider({css:{margin:'10px'}});
    var s2 = new web.Slider({css:{margin:'10px'}});
    page.add(s1);
    page.add(s2);
    
    s1.on("value", function() { s2.value = this.value / 2; });
    s2.on("value", function() { s1.value = this.value * 2; });
};