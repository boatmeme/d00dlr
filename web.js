var async   = require('async');
var express = require('express');
var url = require('url');
var http = require('http');
var https = require('https');
var util    = require('util');
var needle = require('needle');

// create an express webserver
var app = express.createServer(
  express.logger(),
  express.static(__dirname + '/public'),
  express.bodyParser(),
  express.cookieParser(),
  // set this to a secret value to encrypt session cookies
  express.session({ secret: process.env.SESSION_SECRET || 'secret123' }),
  require('faceplate').middleware({
    app_id: process.env.FACEBOOK_APP_ID || process.argv[2],
    secret: process.env.FACEBOOK_SECRET || process.argv[3],
    scope:  'publish_actions,friends_photos,user_likes,user_photos,user_photo_video_tags,photo_upload,publish_stream,read_stream,status_update'
  })
);

// listen to the PORT given to us in the environment
var port = process.env.PORT || 3000;

app.listen(port, function() {
  console.log("Listening on " + port);
});

app.dynamicHelpers({
  'host': function(req, res) {
    return req.headers['host'];
  },
  'scheme': function(req, res) {
    req.headers['x-forwarded-proto'] || 'http'
  },
  'url': function(req, res) {
    return function(path) {
      return app.dynamicViewHelpers.scheme(req, res) + app.dynamicViewHelpers.url_no_scheme(path);
    }
  },
  'url_no_scheme': function(req, res) {
    return function(path) {
      return '://' + app.dynamicViewHelpers.host(req, res) + path;
    }
  },
});

function render_page(req, res) {
  req.facebook.app(function(app) {
    req.facebook.me(function(user) {
      res.render('index.ejs', {
        layout:    true,
        req:       req,
        app:       app,
        user:      user
      });
    });
  });
}

function handle_facebook_request(req, res) {

  // if the user is logged in
  if (req.facebook.token) {

    async.parallel([
      function(cb) {
        // query 4 friends and send them to the socket for this socket id
        req.facebook.get('/me/friends', { limit: 4 }, function(friends) {
          req.friends = friends;
          cb();
        });
      },
      function(cb) {
        // query 4 likes and send them to the socket for this socket id
        req.facebook.get('/me/likes', { limit: 4 }, function(likes) {
          req.likes = likes;
          cb();
        });
      }
    ], function() {
      render_page(req, res);
    });

  } else {
    render_page(req, res);
  }
}

function handle_draw_request(req,res) {
      req.facebook.app(function(app) {
        req.facebook.me(function(user) {
          res.render('draw.ejs', {
            layout:    true,
            req:       req,
            app:       app,
            user:      user
          });
        });
      });
}

function handle_image_request(proxyReq,proxyResp) {
    var imgURL = proxyReq.params.url;
    if(imgURL) {
        var destParams = url.parse(imgURL);
        var reqOptions = {
            hostname : destParams.hostname,
            port : destParams.port,
            path : destParams.path,
            method : "GET"
        };
        var protocol = (destParams.protocol == 'https:' ? https : http);
        var req = protocol.request(reqOptions, function(res) {
            proxyResp.header('Access-Control-Allow-Origin','*');
            proxyResp.header('Access-Control-Allow-Headers','X-Requested-With');
            
            res.on('data', function(chunk) {
                proxyResp.write(chunk);
            });
    
            res.on('end', function() {
                var redirect = false;
                
                if(this.headers.location) {
                    proxyReq.params.url = this.headers.location;
                    redirect = true;
                }
                if(redirect) {
                    console.log('redirecting to :'+proxyReq.params.url);
                    handle_image_request(proxyReq, proxyResp);
                } else {
                   proxyResp.end();
                }
            });
        });

        req.on('error', function(e) {
            console.log('problem with request: ' + e.message);
            proxyResp.writeHead(503);
            proxyResp.write("An error happened!");
            proxyResp.end();
        });
        req.end();
    } else {
        proxyResp.writeHead(503);
        proxyResp.write("Must provide a URL!");
        proxyResp.end();  
    }
}

function handle_download_request(proxyReq,proxyResp) {
    var imgData = proxyReq.body.dataUrl;
    if(imgData) {
        var dataBuffer = new Buffer(imgData.replace(/^data:image\/png;base64,/,""), 'base64');
        proxyResp.header('Content-Type','image/png;');
        proxyResp.header('Content-Disposition','attachment; filename="d00dlr_' + Date.now() + '.png');
        proxyResp.header('Content-Length', dataBuffer.length);
        proxyResp.end(dataBuffer,'binary');
    } else {
        proxyResp.writeHead(503);
        proxyResp.write("Must provide image data!");
        proxyResp.end();  
    }
}

function handle_upload_request(proxyReq,proxyResp) {
    var imgData = proxyReq.body.dataUrl;
    if(imgData) {
        var dataBuffer = new Buffer(imgData.replace(/^data:image\/png;base64,/,""), 'base64');
        var uploadUrl = 'https://graph.facebook.com/me/photos';
        var data = {
            message: proxyReq.body.messageText,
            access_token: proxyReq.facebook.token,
            source: { buffer: dataBuffer, filename: 'd00dlr_' + Date.now() + '.png', content_type: 'image/png' }
        };
        
        needle.post(uploadUrl, data, {multipart: true}, function(err, resp, body) {
           proxyResp.write(body);
           proxyResp.end();
        });
        
    } else {
        proxyResp.writeHead(503);
        proxyResp.write("Must provide image data!");
        proxyResp.end();  
    }
}

function handle_friends_photos_request(req, res) {
    // use fql to get a list of my friends that are using this app
    req.facebook.get('/fql',{q:'{' +
            '"photos" : "SELECT owner, src_big, src_small, src FROM photo WHERE aid IN (SELECT aid FROM album WHERE owner in (SELECT uid2 FROM friend WHERE uid1=me()) ORDER BY modified desc) ORDER BY modified desc LIMIT 1,16",' +
            '"users" : "SELECT name,id from profile WHERE id IN (SELECT owner FROM #photos)"' +
        '}'}, function(result) {
              var photos = result[0].fql_result_set;
              var users = result[1].fql_result_set; 
              photos.forEach(function(photo) {
                 users.forEach(function(user) {
                    if(user.id == photo.owner) {
                        photo.user = user;   
                    }
                 });    
             });
          req.friends_photos = photos;
          res.render('friend_photos.ejs', {
            layout:    false,
            req:       req
          });
    });    
}

function handle_your_photos_request(req,res) {
    req.facebook.get('/me/photos', { limit: 16 }, function(photos) {
        req.photos = photos;
        res.render('your_photos.ejs', {
            layout:    false,
            req:       req
        });
    });
}

app.get('/', handle_facebook_request);
app.get('/me/photos', handle_your_photos_request);
app.get('/friends/photos', handle_friends_photos_request);
app.post('/', handle_facebook_request);
app.get('/draw/:url', handle_draw_request);
app.post('/download', handle_download_request);
app.post('/upload', handle_upload_request);
app.get('/image/:url', handle_image_request);