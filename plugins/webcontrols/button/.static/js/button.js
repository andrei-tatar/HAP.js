function btclick(id) {
	socket.emit("bt_clk", id);
}

socket.on("btut", function (data) {$("#bt"+data.id).text(data.value);});
socket.on("btue", function (data) {
    if (data.value)
        $("#bt"+data.id).removeAttr("disabled");
    else
        $("#bt"+data.id).attr("disabled", "disabled");
});