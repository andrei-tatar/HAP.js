var self = module.exports = function() {
    function getFunction(p1, p2)
    {
        var a = (p2.y - p1.y)/(p2.x - p1.x);
        var b = p1.y - a*p1.x;
        return function(x) {
            return a*x + b;
        };
    }

    this.getMeanValues = function (dataset, start, end, count) {
        if (dataset.length < 2 || dataset[0].x > start)
            return undefined;

        var relevantData = [];
        for (var i = 0; i < dataset.length - 1; i++)
        {
            var p1 = dataset[i];
            var p2 = dataset[i + 1];

            if (p2.x < start) continue;
            if (p1.x > end) break;

            relevantData.push({ func: getFunction(p1, p2), p1: p1, p2: p2});
        }

        var means = [];
        var slice = (end - start)/count;
        var j = 0;
        for (var i = 0; i < count; i++)
        {
            var left = start + i*slice;
            var right = left + slice;

            var total = 0.0, div = 0.0;

            while (j < relevantData.length)
            {
                var d = relevantData[j];
                var intRight = Math.min(d.p2.x, right);
                var intLeft = Math.max(d.p1.x, left);
                var intLength = intRight - intLeft;

                var mean = (d.func(intLeft) + d.func(intRight))/2;
                total += mean*intLength;
                div += intLength;

                if (right >= d.p2.x) j++;
                if (right <= d.p2.x) break;
            }

            means.push(total/div);

            if (j >= relevantData.length)
                break;
        }

        return means;
    };

    var m = this.getMeanValues([{x:0,y:0},{x:1,y:1},{x:2,y:0}], 0, 2, 100);
    //console.log(m);
};
