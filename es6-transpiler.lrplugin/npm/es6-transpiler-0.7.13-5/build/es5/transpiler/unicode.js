// http://mathiasbynens.be/notes/javascript-unicode#string-methods
// https://github.com/bestiejs/punycode.js
// punycode.ucs2.decode('\uD834\uDF06')[0].toString(16) == "1d306"
// [punycode.ucs2.encode([0x1D306]).charCodeAt(0).toString(16), punycode.ucs2.encode([0x1D306]).charCodeAt(1).toString(16) ] == ["d834", "df06"]

"use strict";

var assert = require("assert");
var error = require("./../lib/error");
var core = require("./core");
var jsesc = require("jsesc");

function isStringLiteral(node) {
	var raw;
	return node
		&& (raw = node.raw + "")
		&& (
			( raw[0] === "\"" && raw[raw.length - 1] === "\"" )
			|| ( raw[0] === "\'" && raw[raw.length - 1] === "\'")
		)
	;
}

var plugin = module.exports = {
	reset: function() {

	}

	, setup: function(alter, ast, options) {
		if( !this.__isInit ) {
			this.reset();
			this.__isInit = true;
		}

		this.alter = alter;
		this.ast = ast;
		this.options = options;
	}

	, '::Literal': function(node) {
		if ( node.$unicode === true || !isStringLiteral(node) ) {
			return;
		}

		var convertRes = this.convert(node.raw), hasChanges = !!convertRes.changes;

		if ( hasChanges ) {
			node.$unicode = true;
			this.alter.replace(node.range[0], node.range[1], convertRes.string);
		}
	}

	, markToSkip: function(node) {
		node.$unicode = true;
	}

	, convert: function(rawString) {
		var changes = 0, self = this;

		rawString = rawString.replace(/\\u\{(\w{1,6})\}/g, function(str, found) {
			changes++;

			return self.charCodesFromCodePoint(found);
		});

		return {
			string: rawString
			, changes: changes
		}
	}

	, charCodesFromCodePoint: function(codePoint) {
		if ( typeof codePoint != "number" ) {
			codePoint = parseInt(codePoint, 16)
		}

		var codePointString = String.fromCodePoint(codePoint);
		var length = codePointString.length;

		assert(length <= 2 && length > 0, 'Invalid unicode sequence.');

		return this.charCodeToString(codePointString.charCodeAt(0)) + (length > 1 ? this.charCodeToString(codePointString.charCodeAt(1)) : "");
	}

	, charCodeToString: function(charCode) {
		charCode = charCode.toString(16).toUpperCase();
		var length = charCode.length;

		assert(length && length < 5, 'Invalid unicode sequence.');

		return "\\u" + "0".repeat(4 - length) + charCode;
	}

	, escape: function(str) {
		return jsesc(str);
	}
};

for(var i in plugin) if( plugin.hasOwnProperty(i) && typeof plugin[i] === "function" ) {
	plugin[i] = plugin[i].bind(plugin);
}
