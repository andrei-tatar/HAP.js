var self = module.exports = function(webcontainer, collapsible, button, tabcontrol, tabpage) {
    var tabc = tabcontrol.create();
    
    var c = 1;
    webcontainer.root.add(button.create({
        text: "Add",
        click: function() {
            var newPage = tabpage.create({title: "Page " + c++});
            newPage.add(button.create({
                text: "Remove",
                click: function() {
                    newPage.remove();
                }
            }));
            tabc.add(newPage);
        }
    }));
    
    
    var page1 = tabpage.create({title: "Page 1"});
    var page2 = tabpage.create({title: "Page 2"});
    
    tabc.add(page1);
    tabc.add(page2);
    
    page1.add("Test Item on Page 1");
    page2.add("Test Item on Page 2");
    page2.add("This really works?");
    page2.add(button.create({
        text: "Remove this page!",
        click: function() {
            page2.remove();
        }
    }));
    
    page1.add(button.create({
        text: "Change title",
        click: function() {
            page1.title += ".";
            page1.refresh();
        }
    }));
    
    webcontainer.root.add(tabc);
    return;
    
    
    var tempGroup = collapsible.create({title: "Temperatura"});
    webcontainer.root.add(tempGroup);

    var iii=0; 
    var st = tempGroup.add({html: function(){return "Count "+iii++; }});
    
    var subGroup = collapsible.create({title:"Sub"});
    subAdded = tempGroup.add(subGroup);
    var i =0;
    webcontainer.root.add(button.create({
        text: "Add",
        click: function() {
            subGroup.add("Item " + i++);
        }
    }));
    
    webcontainer.root.add(button.create({
        text: "Remove",
        click: function() {
            subAdded.remove();
        }
    }));
    
    webcontainer.root.add(button.create({
        text: "Refresh",
        click: st.refresh
    }));
};