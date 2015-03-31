module.exports = function(MainTab, web) {
    var page = new web.TabPage({title: "User Container", order: 100});
    MainTab.add(page);

    var uc = new web.UserContainer();
    page.add(uc);
    
    uc.add("This appears if you are logged in!", "admins");
    
    var i = 0;
    uc.add(new web.Button({text: "add for logged in"})).on('click', function () {
        uc.add("Item " + i++, "admins");
    });
    uc.add(new web.Button({text: "Admin"}), "admins").on('click', function() {
        console.log("An admin clicked me!");
    });
};