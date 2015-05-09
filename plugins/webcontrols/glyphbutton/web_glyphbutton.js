module.exports = function() {
    function updateText(button) {
        button.text = '<span class="glyphicon glyphicon-' + button.glyph + '" aria-hidden="true"></span>';
    }

    this.init = function (web) {
        web.GlyphButton = function(opt) {
            var glyph = '';
            opt.rawHtml = true;
            var button = new web.Button(opt);

            button.__defineGetter__("glyph", function(){return glyph;});
            button.__defineSetter__("glyph", function(arg) {
                if (glyph === arg) return;
                glyph = arg;
                updateText(this);
            });

            button.glyph = (opt || {}).glyph || '';

            return button;
        };
    }
};