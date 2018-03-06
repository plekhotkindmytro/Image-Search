const {google} = require('googleapis');
const customsearch = google.customsearch('v1');

var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var mongoUrl =process.env.MONGOLAB_URI; 


var express = require('express');
var app = express();



// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

app.get("/api/latest/imagesearch", function (request, response) {
  
  MongoClient.connect(mongoUrl,function(err, db) {
      if (err) {
        response.send({error: 'Unable to connect to the mongoDB server. Error:'+err});
      } else {
        
        db.collection('searchHistory').find({}, {_id: 0, when: 1, term: 1}).sort({when: -1}).limit(10).toArray(function(err, data) {
            if(!err) {
              
              response.send(data);
            } else {
              response.send({error: err});
            }
            db.close();
        });
     
      }          
  });
});

app.get("/api/imagesearch/:query", function (request, response) {
  console.log(request.params.query);
  var offset = parseInt(request.query.offset);
  if(isNaN(offset) || offset < 1) {
    offset = 1;
  }
  
  saveHistory(request.params.query);
  
  
  customsearch.cse.list({
    cx: process.env.GOOGLE_CX,
    q: request.params.query,
    auth: process.env.GOOGLE_API_KEY,
    searchType: "image",
    num: 10,
    start: offset
  }, (err, res) => {
    if (err) {
      console.log("Error", err);
      response.send(err);
    } else {
      var json  = res.data.items.map(function(item) {
        return {
          url: item.link,
          snippet: item.snippet,
          thumbnail: item.image.thumbnailLink,
          context:  item.image.contextLink
        };
      });
      response.send(json);
    }
  });
  
  
});

function saveHistory(query) {
  MongoClient.connect(mongoUrl,function(err, db) {
      if (err) {
        console.log('Unable to connect to the mongoDB server. Error:'+err);
      } else {
        
        db.collection('searchHistory').insert({term: query, when: new Date()}, function(err, data) {
            if(!err) {
              console.log("Saved");
            } else {
              console.log("Error while savind data:", err);
            }
            db.close();
        });
      
      }

  });
}


// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
