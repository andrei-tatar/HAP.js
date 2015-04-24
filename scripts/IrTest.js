module.exports = function (MainTab, web, node) {
    var panel = new web.TabPage({title: "TV"});
    panel.add('<br>');
    MainTab.add(panel);

    function sendCode() {
        var blaster = node.device('ir_living');
        if (blaster) blaster.send_ir(this.code);
    }

    var power = new web.Button({text: "Power", code: 'SAM_e0e040bf'});
    var volDown = new web.Button({text: "Vol -", code: 'SAM_e0e0d02f'});
    var volUp = new web.Button({text: "Vol +", code: 'SAM_e0e0e01f'});
    var mute = new web.Button({text: "Mute", code: 'SAM_e0e0f00f'});
    var prevCh = new web.Button({text: "CH -", code: 'SAM_e0e008f7'});
    var nextCh = new web.Button({text: "CH +", code: 'SAM_e0e048b7'});
    var allButtons = [power, mute, null, volDown, volUp, null, prevCh, nextCh];
    allButtons.forEach(function(bt){
        if (bt == null)
            panel.add('<br>');
        else {
            bt.css = { width: '30%', margin:'1px' };
            if (bt == power) bt.css.background = '#ff0039';
            bt.enabled = false;
            bt.on('click', sendCode);
            panel.add(bt);
        }
    });

    var notifier = new web.Notifier();

    var blaster = node.device('ir_living');

    blaster.on('connected', function () {
        allButtons.forEach(function (bt) {
            if (bt)bt.enabled = true;
        });
    });

    blaster.on('ir', function (code) {
        notifier.info({message: code, timeout: 15000});
        console.log(code);
    });

    panel.add(notifier);
};