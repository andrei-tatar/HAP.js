var self = module.exports = function(web, log) {
    web.root.add(new web.Button({
        text: "Load All",
        click: function () {
            
            var c = new web.Collapsible({title:"Not collapsed"});
            c.add("Visible");
            web.root.add(c);
            
            var c = new web.Collapsible({title:"Collapsed", collapsed:true});
            c.add("Not Visible");
            web.root.add(c);
        }
    }));
    
    web.root.add("<br>");
    web.root.add(new web.Chart());
    web.root.add("<br>");
    
    var slider = new web.Slider();
    web.root.add(slider);
    
    web.root.add(new web.Button({
        text: "Remove",
        click: function() {
            if (!slider) return;
            slider.remove();
            log.i("Removed!");
            slider = undefined;
        }
    }));
};