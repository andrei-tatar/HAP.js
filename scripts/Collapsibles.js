module.exports = function(MainTab, web, log) {
    var page = new web.TabPage({title: "Collapsibles"});
    MainTab.add(page);

    var c1 = new web.Collapsible({title: "This is a collapsible", css: {margin: "5px"}});
    c1.add("Of course it can contain anything...");
    page.add(c1);
    
    var c2 = new web.Collapsible({title: "This is collapsed", css: {margin: "5px"}, collapsed: true});
    c2.add("<i>Of course</i> it can contain anything <b>again</b>...");
    
    page.add(c2);
};