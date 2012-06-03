var async   = require('async');
var express = require('express');
var url = require('url');
var http = require('http');
var util    = require('util');

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
    scope:  'user_likes,user_photos,user_photo_video_tags'
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
        layout:    false,
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
        // query 16 photos and send them to the socket for this socket id
        req.facebook.get('/me/photos', { limit: 16 }, function(photos) {
          req.photos = photos;
          cb();
        });
      },
      function(cb) {
        // query 4 likes and send them to the socket for this socket id
        req.facebook.get('/me/likes', { limit: 4 }, function(likes) {
          req.likes = likes;
          cb();
        });
      },
      function(cb) {
        // use fql to get a list of my friends that are using this app
        req.facebook.fql('SELECT uid, name, is_app_user, pic_square FROM user WHERE uid in (SELECT uid2 FROM friend WHERE uid1 = me()) AND is_app_user = 1', function(result) {
          req.friends_using_app = result;
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
    res.render('draw.ejs',{
        layout:    false,
        req:       req
      });
}

function handle_image_request(proxyReq,proxyResp) {
    console.log(proxyReq.params.url);
    var imgURL = proxyReq.params.url;
    if(imgURL) {
        var destParams = url.parse(imgURL);
        var reqOptions = {
            host : destParams.host,
            port : destParams.port,
            path : destParams.pathname,
            method : "GET"
        };
        var req = http.request(reqOptions, function(res) {
            var headers = res.headers;
            headers['Access-Control-Allow-Origin'] = '*';
            headers['Access-Control-Allow-Headers'] = 'X-Requested-With';
            proxyResp.writeHead(200, headers);
    
            res.on('data', function(chunk) {
                proxyResp.write(chunk);
            });
    
            res.on('end', function() {
                proxyResp.end();
            });
        });

        req.on('error', function(e) {
            console.log('problem with request: ' + e.message);
            proxyResp.writeHead(503);
            proxyResp.write("An error happened!");
            proxyResp.end();
        });
        req.end();
    }
}

app.get('/', handle_facebook_request);
app.post('/', handle_facebook_request);
app.get('/draw', handle_draw_request);
app.get('/image/:url', handle_image_request);


