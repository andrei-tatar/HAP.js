function chk(sender, id) {
    socket.emit("chk_ch", {id: id, value: sender.checked});
}

socket.on("chkut", function (data) {$("#chk"+data.id).text(data.value);});
socket.on("chkue", function (data) {
    $("#chk"+data.id).prop('disabled', !data.value);
    if (data.value)
        $("#chkd"+data.id).removeClass('disabled');
    else
        $("#chkd"+data.id).addClass('disabled');
});
socket.on("chkuc", function (data) {
    $("#chk"+data.id).prop('checked', data.value);
});