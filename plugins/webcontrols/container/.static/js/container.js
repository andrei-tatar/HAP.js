socket.on("ct_rm", function (id) {
	$("[data-ownedby='"+id+"']").remove();
    $("[data-id='"+id+"']").remove();
});

socket.on("ct_upd", function (arg) {
    $.ajax({
		url: "/container/render/" + arg.id + "/" + arg.child.id,
	}).done(function (html) {
		addContainerChild($("["+arg.attrib+"]"), html, arg.child);
	});
});

function cLoad(tmpParentId) {
    var tparent = $("#"+tmpParentId);
    tparent.remove();
    var parentid = tparent.attr("data-sparent");
    var parent = $("["+parentid+"]");
    
    tparent.children("div").each(function () {    
        var child = $(this);
        var id = child.attr("data-sid");
        var order = child.attr("data-sorder");
        addContainerChild(parent, child.text(), {
            id: id,
            order: order
        });
    });
}

function addContainerChild(rootElement, html, child) {
	var element = html.indexOf("<") == 0 ? $(html) : $("<div>" + html + "</div>");
    element.each(function (index) {
        $(this).attr(index == 0 ? 
            {"data-id": child.id, "data-order": child.order} : 
            {"data-ownedby": child.id});
    });

	var prevElement = $("[data-id='"+child.id+"']");
	if (prevElement.length > 0) {
        $("[data-ownedby='"+child.id+"']").remove();
		prevElement.replaceWith(element);
		return;
	}
	
	var prevChild = undefined;
	var children = rootElement.children();
	if (children.length == 0) {
		rootElement.append(element);
		return;
	}
	
	for (var i=0;i<children.length; i++) {
		child = $(children[i]);
		var order = child.attr("data-order");
		if (child.order < order) {
			if (prevChild)
				element.insertAfter(prevChild);
			else
				rootElement.prepend(element);
			return;
		}
		
		prevChild = child;
	}
	
	rootElement.append(element);
};

$.ajax({url: "/rootcontainer"}).done(function (data) {$("body").append(data);});