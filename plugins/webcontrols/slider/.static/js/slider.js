var ignoreSliderUpdate = false;

function loadSl(id) {
    $('#slr' + id).remove();
    $('#sl' + id).slider().on('change', function(c) { 
        if (ignoreSliderUpdate) return;
        socket.emit("slc", {id:id, value:c.value.newValue});
    });
}

socket.on("slu", function (data) {
    ignoreSliderUpdate = true;
    $('#sl' + data.id).data("slider").setValue(data.value);
    ignoreSliderUpdate = false;
});