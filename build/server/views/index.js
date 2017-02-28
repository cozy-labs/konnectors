function pug_attr(t,e,n,f){return e!==!1&&null!=e&&(e||"class"!==t&&"style"!==t)?e===!0?" "+(f?t:t+'="'+t+'"'):("function"==typeof e.toJSON&&(e=e.toJSON()),"string"==typeof e||(e=JSON.stringify(e),n||e.indexOf('"')===-1)?(n&&(e=pug_escape(e))," "+t+'="'+e+'"'):" "+t+"='"+e.replace(/'/g,"&#39;")+"'"):""}
function pug_escape(e){var a=""+e,t=pug_match_html.exec(a);if(!t)return e;var r,c,n,s="";for(r=t.index,c=0;r<a.length;r++){switch(a.charCodeAt(r)){case 34:n="&quot;";break;case 38:n="&amp;";break;case 60:n="&lt;";break;case 62:n="&gt;";break;default:continue}c!==r&&(s+=a.substring(c,r)),c=r+1,s+=n}return c!==r?s+a.substring(c,r):s}
var pug_match_html=/["&<>]/;function template(locals) {var pug_html = "", pug_mixins = {}, pug_interp;;var locals_for_with = (locals || {});(function (JSON, hash, imports, locale) {pug_html = pug_html + "\u003C!DOCTYPE html\u003E\u003Chtml" + (pug_attr("lang", locale, true, true)) + "\u003E\u003Cmeta charset=\"utf-8\"\u003E\u003Cmeta name=\"viewport\" content=\"width=device-width, initial-scale=1\"\u003E\u003Ctitle\u003ECozy - Konnectors\u003C\u002Ftitle\u003E\u003Clink rel=\"apple-touch-icon\" sizes=\"180x180\" href=\"\u002Fapps\u002Fkonnectors\u002Fapple-touch-icon.png\"\u003E\u003Clink rel=\"icon\" type=\"image\u002Fpng\" href=\"\u002Fapps\u002Fkonnectors\u002Ffavicon-32x32.png\" sizes=\"32x32\"\u003E\u003Clink rel=\"icon\" type=\"image\u002Fpng\" href=\"\u002Fapps\u002Fkonnectors\u002Ffavicon-16x16.png\" sizes=\"16x16\"\u003E\u003Clink rel=\"manifest\" href=\"\u002Fapps\u002Fkonnectors\u002Fmanifest.json\"\u003E\u003Clink rel=\"mask-icon\" href=\"\u002Fapps\u002Fkonnectors\u002Fsafari-pinned-tab.svg\" color=\"#5bbad5\"\u003E\u003Clink rel=\"shortcut icon\" href=\"\u002Fapps\u002Fkonnectors\u002Ffavicon.ico\"\u003E\u003Cmeta name=\"apple-mobile-web-app-title\" content=\"Cozy MyAccounts\"\u003E\u003Cmeta name=\"application-name\" content=\"Cozy MyAccounts\"\u003E\u003Cmeta name=\"msapplication-config\" content=\"\u002Fapps\u002Fkonnectors\u002Fbrowserconfig.xml\"\u003E\u003Cmeta name=\"theme-color\" content=\"#ffffff\"\u003E\u003Clink rel=\"stylesheet\" href=\"\u002Ffonts\u002Ffonts.css\"\u003E\u003Clink" + (" rel=\"stylesheet\""+pug_attr("href", `app${hash}.css`, true, true)) + "\u003E";
if (imports) {
pug_html = pug_html + "\u003Cscript\u003Ewindow.initKonnectors = " + (null == (pug_interp = JSON.stringify(imports.konnectors)) ? "" : pug_interp) + "\nwindow.initFolders = " + (null == (pug_interp = JSON.stringify(imports.folders)) ? "" : pug_interp) + "\nwindow.context = '" + (null == (pug_interp = imports.context) ? "" : pug_interp) + "'\u003C\u002Fscript\u003E";
}
pug_html = pug_html + "\u003Cscript" + (pug_attr("src", `app${hash}.js`, true, true)+" defer") + "\u003E\u003C\u002Fscript\u003E\u003Cdiv role=\"application\"\u003E\u003C\u002Fdiv\u003E\u003C\u002Fhtml\u003E";}.call(this,"JSON" in locals_for_with?locals_for_with.JSON:typeof JSON!=="undefined"?JSON:undefined,"hash" in locals_for_with?locals_for_with.hash:typeof hash!=="undefined"?hash:undefined,"imports" in locals_for_with?locals_for_with.imports:typeof imports!=="undefined"?imports:undefined,"locale" in locals_for_with?locals_for_with.locale:typeof locale!=="undefined"?locale:undefined));;return pug_html;}; module.exports = template