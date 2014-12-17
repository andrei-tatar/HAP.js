var self = module.exports = function(p, b, log) {
	if (!p.data || !p.data.test) p.data = { test : { a: 0 } };

	b.bind(p, "data.test.a", p, "data.test.b", function(v) {return v+1;});
	b.watch(p, "data.test.b", function(v) {
		log.i("b: " + v);
	});
	log.i("a: " + ++p.data.test.a);
};
self.__meta = {
	imports: ["preferences", "binding", "log"],
};