var Hapi = require('hapi'),
  http = require('http'),
  Path = require('path'),
  cheerio = require('cheerio');

var server = new Hapi.Server(~~process.env.PORT || 3000, '0.0.0.0');

server.views({
  engines: {
    html: require('handlebars')
  },
  path: Path.join(__dirname, 'templates')
});

var responseCount = 0;

var waitForReponse = function() {
  responseCount++;
};

var complete = function() {
  responseCount--;
  return responseCount === 0;
};

server.route({
  method: 'GET',
  path: '/{q}',
  handler: function (request, response) {
    var q = (request.query.q || request.params.q).toLowerCase();
    var html = '';
    
    http.get('http://atdhe.me/', function(res) {
      res.on('data', function(d) {
        html += d;
      });
      
      res.on('end', function() {
        $ = cheerio.load(html);
        var links = [];
        waitForReponse();
        
        $('a').each(function() {
          var href = $(this).attr('href');
          var title = $(this).text();
          var str = (title + href).toLowerCase();
        
          if (str.indexOf(q) !== -1 && str.indexOf('affiliate') === -1 && str.indexOf('traffic') === -1) {
            waitForReponse();
          
            http.get(href, function(r) {
              var h = '';
            
              r.on('data', function(d) {
                h += d;
              });
            
              r.on('end', function() {
                $h = cheerio.load(h);
                href = $h('iframe').last().attr('src');
                waitForReponse();
                
                http.get(href, function(a) {
                  var b = '';
                  
                  a.on('data', function(d) {
                    b += d;
                  });
    
                  a.on('end', function() {
                    $hi = cheerio.load(b);
                    
                    $hi('iframe').each(function() {
                      href = $(this).attr('src');
                      
                      if (href.indexOf('ad') === -1 && href.indexOf('reven') === -1) {
                        links.push({
                          title: title,
                          href: href
                        });
                      }
                    });
                    
                    complete() && response.view('search', { links: links });
                  });
                });
                
                complete() && response.view('search', { links: links });
              });
            });
          }
        });
        
        complete() && response.view('search', { links: links });
      });
    });
  }
});

server.route({
    method: 'GET',
    path: '/',
    handler: function (request, response) {
        response.view('index');
    }
});

server.start(function () {
  console.log('Server running at:', server.info.uri);
});