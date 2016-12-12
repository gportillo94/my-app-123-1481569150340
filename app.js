'use strict';

var express    = require('express'),
  app          = express(),
  watson       = require('watson-developer-cloud'),
  extend       = require('util')._extend,
  i18n         = require('i18next');

const MAX_TWEETS = 250 ; 
var request = require('request'); 
var services = JSON.parse(process.env.VCAP_SERVICES || "{}");

var insight_host = services["twitterinsights"] ? services["twitterinsights"][0].credentials.url : "https://ef7e4040-3426-4b2a-80aa-189d190e3c0f:k6eTXb1H9t@cdeservice.mybluemix.net";

require('./config/i18n')(app);

require('./config/express')(app);

var personalityInsights = watson.personality_insights({
	
  version: 'v2',/*
  username: '<username>',
  password: '<password>'
*/

	password: "J5jiy4pPhUkc",
	url: "https://gateway.watsonplatform.net/personality-insights/api",
	username: "16cb7715-dd47-4d32-bac7-2079b419f966"


});

/*****************************************************************************/
function insightRequest(path, query, done) {
    console.log(insight_host); 
    request({
        method: "GET",
        url: insight_host + '/api/v1/messages' + path,
        qs: {
            q: query,
            size: MAX_TWEETS
        }
    }, function(err, response, data) {
        if (err) {
            done(err);
        } else {
            if (response.statusCode == 200) {
                try {
                    done(null, JSON.parse(data));
                } catch(e) {
                    done({ 
                        error: { 
                            description: e.message
                        },
                        status_code: response.statusCode
                    });
                }
            } else {
                done({ 
                    error: { 
                        description: data 
                    },
                    status_code: response.statusCode
                });
            }
        }
    });
}
/*****************************************************************************/

app.get('/', function(req, res) {
  res.render('index', { ct: req._csrfToken });
});

app.post('/api/profile', function(req, res, next) {

    console.log(req.body.text); 

    var ret = [] ; 
    var twitts ; 

    twitts =  insightRequest("/search", req.body.text, function(err, data) {
        if (err) {
            console.log("if"); 
            res.send(err).status(400);
        } 
        else 
        {
            console.log("else"); 
            //var ret = []; 
            for (var i =0 ; i <data.tweets.length ; i++)
                ret.push(data.tweets[i].message.body); 
            twitts = ret.join("."); 

           // console.log(twitts);

            req.body.text = twitts ; 

            var parameters = extend(req.body, { acceptLanguage : i18n.lng() });

            console.log("console.log(req.body)"); 
            console.log(req.body);
            console.log("console.log(parameters)") ; 
            console.log(parameters); 

            personalityInsights.profile(parameters, function(err, profile) {
              if (err)
                return next(err);
              else
              {
                //console.log("console.log(profile)");   
                //console.log(profile); 
                return res.json(profile);
              }
            });
        }
    });


/*


*/
});

//require('./config/error-handler')(app);

var port = process.env.VCAP_APP_PORT ||  3000;
app.listen(port);
console.log('listening at:', port);
