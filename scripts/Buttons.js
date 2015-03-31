module.exports = function(MainTab, web, log) {
    var page = new web.TabPage({title: "Buttons"});
    MainTab.add(page);

    var b1 = new web.Button({text: "Button 1", css: {margin: "5px 0 0 5px"}});
    var b2 = new web.Button({text: "Button 2", css: {margin: "5px 0 0 5px"}, enabled: false});
    var b3 = new web.Button({text: "Enable", css: {margin: "5px 0 0 5px"}});
    
    page.add(b1);
    page.add(b2);
    page.add(b3);
    
    var n = new web.Notifier({css: {margin: "5px"}});
    page.add(n);
    
    b1.on("click", function () {
        n.info({message: "Clicked! " + this.text, timeout: 3000});
    });
    b2.on("click", function () {
        n.danger({message: "Clicked! " + this.text, timeout: 3000});
    });
    b3.on("click", function () {
        n.warning({message: "Clicked! " + this.text, timeout: 3000});
    });
    
    b3.on("click", function() {
        b2.enabled = !b2.enabled;
        this.text = b2.enabled ? "Disable" : "Enable";
    });
};