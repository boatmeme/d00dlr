var stage,currentTool,currentLayer,imageObj;

var undo = [];
var redo = [];
var paintColor = "rgba(0, 0, 0, 1.0)";

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
    
    $('#colorpicker').colorpicker().on('changeColor', function(ev){
        var color = ev.color.toRGB();
        paintColor = "rgba(" + color.r +"," + color.g + "," + color.b + "," + color.a + ")";
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
    
    $("#filter").on('change',function() {
       var option = this.options[this.selectedIndex];
       applyFilter($("#image").get(0),$(this).val(),JSON.parse(option.getAttribute('data-opts')));
    });
    
    $("#dropperTool").on('click',function() { 
         currentTool = dropperTool;
    });
    $("#paintTool").on('click',function() { 
         currentTool = paintTool;
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

function applyFilter(image, filter, opts) {
    if(filter == "revert") {
        Pixastic.revert(image);
    } else {
        $("#imageContainer").spin();
        Pixastic.process(image, filter, opts, function(){
            $("#imageContainer").spin(false);
        });
    }
}

function getPixel(e) {
  var imgdata = c.getImageData( x, y, 1, 1 );     
}

function loadImage(url,cb) {
    imageObj = new Image();
    $(imageObj).attr('id','image');

    imageObj.onload = function() {
      //drawImage(this);
      stage.setSize(this.width, this.height);
      $("#canvasContainer").css('width',this.width);
      $("#canvasContainer").css('height',this.height);
      $("#imageContainer").empty();
      $("#imageContainer").append(this);
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
        image: $("#image").get(0),
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

var paintTool = {
    lastPos: null,
    paint: false,
    onMouseDown: function(e) {
        undo.unshift(stage.toJSON());
        redo = [];
        var pos = stage.getUserPosition(e);
        currentLayer = new Kinetic.Layer({id: "drawingLayer"}); 
        stage.add(currentLayer);
        this.lastPos = pos;
        this.paint = true;
    },
    onMouseMove: function(e) {
        if(this.paint){
            var currentPos = stage.getUserPosition(e);
            var strokeWidth = 12;
            var line = new Kinetic.Line({
              points: [this.lastPos.x,this.lastPos.y, currentPos.x, currentPos.y],
              stroke: paintColor,
              strokeWidth: strokeWidth,
              lineCap: "round",
              lineJoin: "round"
            });
            currentLayer.add(line);
            currentLayer.draw();
            this.lastPos = currentPos;
        }
    },
    onMouseUp: function(e) {
        this.paint = false;   
    }, 
    onMouseLeave: function(e) {
        this.paint = false;   
    }
}

var dropperTool = {
    onMouseDown: function(e) {
        console.log(stage.getUserPosition(e));
    },
    onMouseMove: function(e) {
        
    },
    onMouseUp: function(e) {
        
    }, 
    onMouseLeave: function(e) {
       
    }
}
currentTool = paintTool;

$("#canvasContainer").on('mousedown',currentTool.onMouseDown);

$("#canvasContainer").on('mousemove',currentTool.onMouseMove);

$("#canvasContainer").on('mouseup',currentTool.onMouseUp);

$("#canvasContainer").on('mouseleave',currentTool.onMouseLeave);