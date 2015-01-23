var self = module.exports = function(webcontainer, collapsible, button) {
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