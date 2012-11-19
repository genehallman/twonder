/*
 * originally based on jsPOS, by Percy Wegmann
 */
module.exports.lex = lex;

var lexicon = {
  // http://daringfireball.net/2010/07/improved_regex_for_matching_urls
  sentence: /^[^\.\?\!]*[\.\?\!]*/i,
  url: /\b(?:(?:[a-z][\w-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\((?:[^\s()<>]+|(?:\([^\s()<>]+\)))*\))+(?:\((?:[^\s()<>]+|(?:\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/i,
  retweet: /^(RT) (@\S*)(:)/i,
  rt: /^RT/i,
	user: /@(\w*)/i,
	hashtag: /#(\w*)/i,
  number: /[0-9]*\.[0-9]+|[0-9]+/i,
  word: /[\w']+/i,
  space: /\s+/i,
  punctuation: /\W/i
};

var lexicon_tree = {
	root: ['retweet', 'sentence'],
	sentence : ['url', 'user', 'hashtag', 'number', 'word', 'space', 'punctuation'],
	url: [],
	retweet: ['rt', 'space', 'user', 'punctuation'],
	user: ['word', 'number', 'punctuation'],
	hashtag: ['word', 'punctuation'],
  number: [],
  word: [],
  space: [],
  punctuation: []
};

function LexerNode(string, lexi) {
	this.string = string;
	this.lexi = lexi;
  this.children = [];

  if (!string) {
		return;
	}
	
	var t_str = string;
	while (t_str.length > 0) {
		var found = false;
		
		for (li in lexicon_tree[this.lexi]) {
			var l = lexicon_tree[this.lexi][li];
			var regex = lexicon[l];
		  var match = t_str.match(regex);

		  if (match && match.index == 0) {				
				found = true;
				t_str = t_str.substring(match[0].length);

				this.children.push(new LexerNode(match[0], l));
				break;
			}
		}

		if (!found) {
			break;
		}
	}
}

function lex(string){
  var node = new LexerNode(string, 'root');
  return node;
}
