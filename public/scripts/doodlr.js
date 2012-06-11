$(document).ready(function() {
    initDrawingCanvas();
    $("#canvasContainer").spin();

    drawImage(startUrl, function() {});

    $("#fetchImage").on('click', function() {
        var url = $("#url").val();
        var _self = this;
        if(url&&url.trim()!="") {
             $(_self).button('loading');
            drawImage(url, function(success) {
                $(_self).button('reset');
                $('#loadModal').modal('hide');
            });
        } else {
            $('#loadModal').modal('hide');
        }
    });

    $("#postImage").on('click',function() {
        $("#canvasContainer").spin();
        $(this).button('loading');
        var data = getImageDataUrl("image/png");
        $('#dataUrlUpload').val(data);
        $("#canvasContainer").spin(false);
        $(this).button('reset');
        $('#uploadForm').submit();
    });

    $("#downloadImage").on('click',function() {
        $(this).button('loading');
        $("#canvasContainer").spin();
        var data = getImageDataUrl("image/png");
        $('#dataUrl').val(data);
        $("#canvasContainer").spin(false);
        $(this).button('reset');
        $('#downloadForm').submit();
    });

    $("canvas").on('selectstart',function() {
        return false;
    })
});

function getImageDataUrl(type) {
    var destCanvas = document.getElementById("destinationCanvas");
    var destCtx = destCanvas.getContext('2d');

    var canvas1 = document.getElementById("imageCanvas");
    var canvas2 = document.getElementById("myCanvas");
    destCanvas.width  = canvas2.width;
    destCanvas.height = canvas2.height;
    destCtx.drawImage(canvas1,0,0);
    destCtx.drawImage(canvas2,0,0);
    return destCanvas.toDataURL(type);
}

function drawImage(url,cb) {
    var imageObj = new Image();
    var canvas = document.getElementById("imageCanvas");
    $("#canvasContainer").css('width',canvas.width);
    $("#canvasContainer").css('height',canvas.height);
    $("#canvasContainer").spin();

    imageObj.onload = function() {
      canvas.width  = this.width;
      canvas.height = this.height;
      var context = canvas.getContext("2d");
      initDrawingCanvas(this.width,this.height);
      context.drawImage(imageObj, 0, 0);
      $("#canvasContainer").css('width',canvas.width);
      $("#canvasContainer").css('height',canvas.height);
      $("#canvasContainer").spin(false);
      cb(true);
    };

    imageObj.onerror =  function() {
        $("#canvasContainer").spin(false);
        cb(false);
    };
    imageObj.src = "/image/" + encodeURIComponent(url);
}
function postImage() {

}

//Drawing Code
function initDrawingCanvas(width, height) {
    var canvas = document.getElementById("myCanvas");
    var context = canvas.getContext("2d");
    canvas.width  = width;
    canvas.height = height;
}
$('#myCanvas').mousedown(function(e){
    var offset = $(this).offset();
    var mouseX = e.pageX - offset.left;
    var mouseY = e.pageY - offset.top;

    paint = true;
    addClick(mouseX, mouseY);
    redraw();
});

$('#myCanvas').mousemove(function(e){
    if(paint){
        var offset = $(this).offset();
        var mouseX = e.pageX - offset.left;
        var mouseY = e.pageY - offset.top;
        addClick(mouseX, mouseY, true);
        redraw();
    }
});

$('#myCanvas').mouseup(function(e){
    paint = false;
});

$('#myCanvas').mouseleave(function(e){
    paint = false;
});

var clickX = new Array();
var clickY = new Array();
var clickDrag = new Array();
var paint;

function addClick(x, y, dragging)
{
    clickX.push(x);
    clickY.push(y);
    clickDrag.push(dragging);
}

function redraw(){
  var canvas = document.getElementById("myCanvas");
  var context = canvas.getContext("2d");
  canvas.width = canvas.width; // Clears the canvas

  context.strokeStyle = "#df4b26";
  context.lineJoin = "round";
  context.lineWidth = 5;

  for(var i=0; i < clickX.length; i++)
  {
    context.beginPath();
    if(clickDrag[i] && i){
      context.moveTo(clickX[i-1], clickY[i-1]);
     }else{
       context.moveTo(clickX[i]-1, clickY[i]);
     }
     context.lineTo(clickX[i], clickY[i]);
     context.closePath();
     context.stroke();
  }
}