var stage,lastPos,currentLayer,imageObj;

var undo = [];
var redo = [];

$(document).ready(function() {
    initDrawingCanvas();
    $("#canvasContainer").spin();
    loadImage(startUrl, function() {});

    $("#fetchImage").on('click', function() {
        var url = $("#url").val();
        var _self = this;
        if(url&&url.trim()!="") {
             $(_self).button('loading');
            stage.clear();
            drawImage(url, function(success) {
                $(_self).button('reset');
                $('#loadModal').modal('hide');
            });
        } else {
            $('#loadModal').modal('hide');
        }
        return false;
    });

    $("#postImage").on('click',function() {
        $("#canvasContainer").spin();
        $(this).button('loading');
        drawImage(imageObj);
        stage.toDataURL(function(data) {
            clearImage();
            $('#dataUrlUpload').val(data);
            $("#canvasContainer").spin(false);
            $("#postImage").button('reset');
            $('#uploadForm').submit();
        });
        return false;
    });

    $("#downloadImage").on('click',function() {
        $(this).button('loading');
        $("#canvasContainer").spin();
        drawImage(imageObj);
        stage.toDataURL(function(data) {
            $('#dataUrl').val(data);
            clearImage();
            $("#canvasContainer").spin(false);
            $("#downloadImage").button('reset');
            $('#downloadForm').submit();
        });
        return false;
    });
    
    $(document).keydown(function(e){
        if (e.keyCode==90 && e.ctrlKey && !e.shiftKey) {
            doUndo();
        } else if (e.keyCode==89 && e.ctrlKey) {
            doRedo(); 
        } else if (e.keyCode==90 && e.ctrlKey && e.shiftKey) {
            doRedo();   
        }
    });

    $("canvas").on('selectstart',function() {
        return false;
    });
});

function doUndo() {
    var previousState = undo.shift();
    if(previousState) {
        redo.unshift(stage.toJSON());
        stage.load(previousState);
        //drawImage(imageObj);
    }  
}

function doRedo() {
    var previousState = redo.shift();
    if(previousState) {
        undo.unshift(stage.toJSON());
        stage.load(previousState);
        //drawImage(imageObj);
    }   
}

function loadImage(url,cb) {
    imageObj = new Image();

    imageObj.onload = function() {
      //drawImage(this);
      stage.setSize(this.width, this.height);
      $("#canvasContainer").css('width',this.width);
      $("#canvasContainer").css('height',this.height);
      $('#canvasContainer').css("background-image", "url(" + url + ")");  
      $("#canvasContainer").spin(false);
      cb(true);
    };

    imageObj.onerror =  function() {
        $("#canvasContainer").spin(false);
        cb(false);
    };
    imageObj.src = "/image/" + encodeURIComponent(url);
}

function drawImage(img) {
    var baseLayer = stage.get("#baseLayer")[0];
    
    var image = new Kinetic.Image({
        x: 0,
        y: 0,
        image: img,
        width: img.width,
        height: img.height
    });
    baseLayer.width = img.width;
    baseLayer.height = img.height;
    
    // add the shape to the layer
    baseLayer.add(image);
    baseLayer.draw(); 
}

function clearImage() {
    var baseLayer = stage.get("#baseLayer")[0];
    baseLayer.clear();
}

function postImage() {

}

//Drawing Code
function initDrawingCanvas(width, height) {
    stage = new Kinetic.Stage({
      container: "canvasContainer",
      width: 200,
      height: 200
    });
    stage.add(new Kinetic.Layer({id: "baseLayer"}));
}

var paint;

$("#canvasContainer").on('mousedown',function(e){
    undo.unshift(stage.toJSON());
    redo = [];
    var pos = stage.getUserPosition(e);
    currentLayer = new Kinetic.Layer({id: "drawingLayer"}); 
    stage.add(currentLayer);
    lastPos = pos;
    paint = true;
    addClick(pos);
});

$("#canvasContainer").on('mousemove', function(e){
    if(paint){
        var pos = stage.getUserPosition(e);
        addClick(pos);
    }
});

$("#canvasContainer").on('mouseup',function(e){
    paint = false;   
});

$("#canvasContainer").on('mouseleave',function(e){
    paint = false;
});

function addClick(currentPos)
{
    var line = new Kinetic.Line({
      points: [lastPos.x,lastPos.y, currentPos.x, currentPos.y],
      stroke: "black",
      strokeWidth: 4,
      lineCap: "round",
      lineJoin: "round"
    });
    currentLayer.add(line);
    currentLayer.draw();
    lastPos = currentPos;
}