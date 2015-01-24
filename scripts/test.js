var self = module.exports = function(web) {
    var tabc = new web.TabControl();
    
    var c = 1;
    web.root.add(new web.Button({
        text: "Add",
        click: function() {
            var newPage = new web.TabPage({title: "Page " + c++});
            newPage.add(new web.Button({
                text: "Remove",
                click: function() {
                    newPage.remove();
                }
            }));
            tabc.add(newPage);
        }
    }));
    
    
    var page1 = new web.TabPage({title: "Page 1"});
    var page2 = new web.TabPage({title: "Page 2"});
    
    tabc.add(page1);
    tabc.add(page2);
    
    page1.add("Test Item on Page 1");
    page2.add("Test Item on Page 2");
    page2.add("This really works?");
    page2.add(new web.Button({
        text: "Remove this page!",
        click: function() {
            page2.remove();
        }
    }));
    
    page1.add(new web.Button({
        text: "Change title",
        click: function() {
            page1.title += ".";
            page1.refresh();
        }
    }));
    
    web.root.add(tabc);
    
    var page3 = new web.TabPage({title: "Collapsibles"});
    tabc.add(page3);
    
    var tempGroup = new web.Collapsible({title: "Temperatura"});
    page3.add(tempGroup);

    var iii=0; 
    var st = {html: function(){return "Count "+iii++; }};
    tempGroup.add(st);
    
    var subGroup = new web.Collapsible({title:"Sub"});
    tempGroup.add(subGroup);
    var i =0;
    page3.add(new web.Button({
        text: "Add",
        click: function() {
            subGroup.add("Item " + i++);
        }
    }));
    
    page3.add(new web.Button({
        text: "Remove",
        click: function() {
            subGroup.remove();
        }
    }));
    
    page3.add(new web.Button({
        text: "Refresh",
        click: st.refresh
    }));
    
    /*
    for (var i=0; i< 100; i++) {
        var c = new web.Collapsible({title: "Item " + i});
        c.add("This is just some text to be there so that it is bigger");
        web.root.add(c);
    }
    */
};