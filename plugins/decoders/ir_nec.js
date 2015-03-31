module.exports = function() {
    var max_error = 15; //%

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
                return "NEC_REPEAT_";

            return undefined;
        }

        if (!matches(pulses[1], header_space) || pulses.length != 67)
            return undefined;

        var readByte = function (p, start, invert) {
            var byte = 0;
            for (var i=0; i<8; i++) {
                if (!matches(p[start + i*2], bit_mark))
                    return NaN;
                if (matches(p[start + i*2 + 1], zero_space)) {
                    if (invert)
                        byte |= 1 << i;
                    continue;
                }
                if (matches(p[start + i*2 + 1], one_space)) {
                    if (!invert)
                        byte |= 1 << i;
                    continue;
                }
                return NaN;
            }

            return byte;
        };

        var address = readByte(pulses, 2 + 16*0);
        var address_n = readByte(pulses, 2 + 16*1, true);
        var command = readByte(pulses, 2 + 16*2);
        var command_n = readByte(pulses, 2 + 16*3, true);

        if (address != address_n || command != command_n ||
            isNaN(address) || isNaN(address_n) ||
            isNaN(command) || isNaN(command_n))
            return undefined;

        if (!matches(pulses[66], bit_mark))
            return undefined;

        return 'NEC_' + address.toString(16) + '_' + command.toString(16);
    };

    this.encode = function (code) {
        if (typeof code != "string")
            return undefined;

        var parts = code.split('_');
        if (parts.length != 3 || parts[0] != 'NEC')
            return undefined;

        if (parts[1] == 'REPEAT') {
            return [header_mark, repeat_space, bit_mark];
        }

        var address = parseInt(parts[1], 16);
        var command = parseInt(parts[2], 16);

        if (isNaN(address) || isNaN(command))
            return undefined;

        var pulses = [header_mark, header_space];

        var addByte = function (byte) {
            for (var i=0; i<8; i++) {
                pulses.push(bit_mark);
                pulses.push(byte & (1 << i) ? one_space : zero_space);
            }
        };

        addByte(address);
        addByte(~address);
        addByte(command);
        addByte(~command);
        pulses.push(bit_mark);

        return pulses;
    };
};