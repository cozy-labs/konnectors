var jade = require('jade/runtime');
module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (imports) {
buf.push("<!DOCTYPE html><html><head><title>Konnectors</title><meta charset=\"utf-8\"><meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge,chrome=1\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1.0\"><script src=\"socket.io/socket.io.js\"></script><link rel=\"stylesheet\" href=\"stylesheets/app.css\"></head><body><div class=\"main-container\"></div><script>" + (null == (jade_interp = imports) ? "" : jade_interp) + "</script><script src=\"javascripts/vendor.js\"></script><script src=\"javascripts/app.js\" onload=\"require('initialize');\"></script></body></html>");}.call(this,"imports" in locals_for_with?locals_for_with.imports:typeof imports!=="undefined"?imports:undefined));;return buf.join("");
}