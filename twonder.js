#!/usr/bin/env node
var twitter = require('ntwitter');
var pos = require('pos');
var lexer = require('./lexer');
var querystring = require('querystring');
var sync = require('synchronize');
require('mongo-lite/lib/synchronize')
var mongolite = require('mongo-lite');
var config = require('./config')

function unescapeHtml(safe) {
  return safe
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, "\"")
      .replace(/&#039;/g, "'");
}
var SYMBOLS = {user:1};
var KEYWORD = process.argv.slice(2).join(" ").toLowerCase();
var twit = new twitter(config.twitter);

var db = mongolite.connect('mongodb://localhost/twonder', ['tweets', 'ngrams', 'sentences'])
db.log = null;

twit.stream('user',{'track':KEYWORD}, function(stream) {
	stream.on('data', function (tweet) {
		if (!tweet.text) {
			return;
		}
		
		var statement = unescapeHtml(tweet.text);
		var tokens = lexer.lex(statement);
		var sentences = [];
		// throw away retweet headers
		if (tokens.children.length > 0 && tokens.children[0].lexi == 'retweet') {
			tokens.children.shift();
		}
		for (var i = 0; i < tokens.children.length; i++) {
			var sentence = tokens.children[i];
			sentence.ngrams = []
			
			//build ngrams from sentence
			var base_ngram = [];

			for (j in sentence.children) {
				var node = sentence.children[j];
				if (node.lexi == 'hashtag' || node.lexi == "space") {
					continue;
				} else if (node.lexi == 'user') {
					base_ngram.push(SYMBOLS.user);
				} else {
					base_ngram.push(node.string);
				}
			}
			sentence.ngrams.push(base_ngram);
			
			for (var j = 0; j < base_ngram.length; j++) {
				for (var k = j + 1; k < base_ngram.length; k++) {
					sentence.ngrams.push(base_ngram.slice(j, k))
				}
			}
			
			sentences.push(sentence);
		}

		sync.fiber(function() {
			
			//save tweet
			var tw_doc = db.tweets.insert(tweet);
			
			for (i in sentences) {
				//save ngrams
				sentences[i].ngrams_ids = [];
				for (j in sentences[i].ngrams) {
					var ng_doc = db.ngrams.first({tokens: sentences[i].ngrams[j]});
					if (ng_doc) {
						ng_doc.count = ng_doc.count + 1;
						db.ngrams.update({_id: ng_doc._id}, ng_doc);
					} else {
						ng_doc = db.ngrams.insert({tokens: sentences[i].ngrams[j], count: 1});
					}
					sentences[i].ngrams_ids.push(ng_doc._id);
				}

				//save sentences				
				db.sentences.insert({tweet_id: tw_doc._id, token_tree: sentences[i].children, ngrams: sentences[i].ngram_ids});
			}
		});
	});
});

db.close();
