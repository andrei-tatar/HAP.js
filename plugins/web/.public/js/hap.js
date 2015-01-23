socket = io();

$.ajax({
	url: "/static",
}).done(function(staticHtml) {
	$("body").append(staticHtml);
});
