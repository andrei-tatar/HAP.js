module.exports = function() {
    var max_error = 21; //%

    var header_mark = 9000;
    var header_space = 4500;
    var repeat_space = 2250;

    var bit_mark = 562;
    var zero_space = 562;
    var one_space = 1687;

    function matches(value, target) {
        return Math.abs(value - target) / target * 100 < max_error;
    }

    this.decode = function (pulses) {
        if (pulses.length < 3)
            return undefined;

        if (!matches(pulses[0], header_mark))
            return undefined;

        if (matches(pulses[1], repeat_space)) {
            if (matches(pulses[2], bit_mark) && pulses.length == 3)
                return "NEC_REPEAT";

            return undefined;
        }

        if (!matches(pulses[1], header_space) || pulses.length != 67)
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

        if (!matches(pulses[66], bit_mark))
            return undefined;

        return 'NEC_' + message.toString(16);
    };

    this.encode = function (code) {
        if (typeof code != "string")
            return undefined;

        var parts = code.split('_');
        if (parts.length != 2 || parts[0] != 'NEC')
            return undefined;

        if (parts[1] == 'REPEAT') {
            return [header_mark, repeat_space, bit_mark];
        }

        var nr = parseInt(parts[1], 16);
        if (isNaN(nr)) return undefined;

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