module.exports = function() {
    var max_error = 15; //%

    var header_mark = 4500;
    var header_space = 4500;

    var bit_mark = 590;
    var zero_space = 590;
    var one_space = 1690;

    var stop_mark = 590;

    function matches(value, target) {
        return Math.abs(value - target) / target * 100 < max_error;
    }

    this.decode = function(pulses) {
        if (pulses.length != 67 || !matches(pulses[0], header_mark) || !matches(pulses[1], header_space))
            return undefined;

        var message = 0;
        for (var i = 0; i < 32; i++) {
            message *= 2;

            if (!matches(pulses[2 + i * 2], bit_mark))
                return undefined;

            if (matches(pulses[3 + i * 2], zero_space))
                continue;

            if (matches(pulses[3 + i * 2], one_space)) {
                message += 1;
                continue;
            }

            return undefined;
        }

        if (!matches(pulses[66], stop_mark))
            return undefined;

        return 'SAM_' + message.toString(16);
    };

    this.encode = function(code) {
        if (typeof code != "string")
            return undefined;

        var parts = code.split('_');
        if (parts.length != 2 || parts[0] != 'SAM')
            return undefined;

        var nr = parseInt(parts[1], 16);
        if (isNaN(nr))
            return undefined;

        var message = nr.toString(2);
        var pulses = [header_mark, header_space];
        for (var i=0; i<32; i++) {
            pulses.push(bit_mark);
            pulses.push(i < message.length ? (message[i] == '1' ? one_space : zero_space) : zero_space);
        }
        pulses.push(bit_mark);

        return pulses;
    };
};