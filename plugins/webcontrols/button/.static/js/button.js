function btclick(id) {
	socket.emit("bt_clk", id);
}

socket.on("btut", function (data) {$("#bt"+data.id).text(data.value);});
socket.on("btue", function (data) {
    $("#bt"+data.id).prop('disabled', !data.value);
});