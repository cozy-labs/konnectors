(function(/*! Brunch !*/) {
  'use strict';

  var globals = typeof window !== 'undefined' ? window : global;
  if (typeof globals.require === 'function') return;

  var modules = {};
  var cache = {};

  var has = function(object, name) {
    return ({}).hasOwnProperty.call(object, name);
  };

  var expand = function(root, name) {
    var results = [], parts, part;
    if (/^\.\.?(\/|$)/.test(name)) {
      parts = [root, name].join('/').split('/');
    } else {
      parts = name.split('/');
    }
    for (var i = 0, length = parts.length; i < length; i++) {
      part = parts[i];
      if (part === '..') {
        results.pop();
      } else if (part !== '.' && part !== '') {
        results.push(part);
      }
    }
    return results.join('/');
  };

  var dirname = function(path) {
    return path.split('/').slice(0, -1).join('/');
  };

  var localRequire = function(path) {
    return function(name) {
      var dir = dirname(path);
      var absolute = expand(dir, name);
      return globals.require(absolute, path);
    };
  };

  var initModule = function(name, definition) {
    var module = {id: name, exports: {}};
    cache[name] = module;
    definition(module.exports, localRequire(name), module);
    return module.exports;
  };

  var require = function(name, loaderPath) {
    var path = expand(name, '.');
    if (loaderPath == null) loaderPath = '/';

    if (has(cache, path)) return cache[path].exports;
    if (has(modules, path)) return initModule(path, modules[path]);

    var dirIndex = expand(path, './index');
    if (has(cache, dirIndex)) return cache[dirIndex].exports;
    if (has(modules, dirIndex)) return initModule(dirIndex, modules[dirIndex]);

    throw new Error('Cannot find module "' + name + '" from '+ '"' + loaderPath + '"');
  };

  var define = function(bundle, fn) {
    if (typeof bundle === 'object') {
      for (var key in bundle) {
        if (has(bundle, key)) {
          modules[key] = bundle[key];
        }
      }
    } else {
      modules[bundle] = fn;
    }
  };

  var list = function() {
    var result = [];
    for (var item in modules) {
      if (has(modules, item)) {
        result.push(item);
      }
    }
    return result;
  };

  globals.require = require;
  globals.require.define = define;
  globals.require.register = define;
  globals.require.list = list;
  globals.require.brunch = true;
})();
require.register("application", function(exports, require, module) {
module.exports = {
  initialize: function() {
    var Router;
    Router = require('router');
    this.router = new Router();
    Backbone.history.start();
    if (typeof Object.freeze === 'function') {
      return Object.freeze(this);
    }
  }
};

});

require.register("collections/konnectors", function(exports, require, module) {
var KonnectorsCollection,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

module.exports = KonnectorsCollection = (function(_super) {
  __extends(KonnectorsCollection, _super);

  function KonnectorsCollection() {
    return KonnectorsCollection.__super__.constructor.apply(this, arguments);
  }

  KonnectorsCollection.prototype.model = require('../models/konnector');

  KonnectorsCollection.prototype.url = 'konnectors/';

  return KonnectorsCollection;

})(Backbone.Collection);

});

require.register("initialize", function(exports, require, module) {
var app;

app = require('application');

$(function() {
  require('lib/app_helpers');
  return app.initialize();
});

});

require.register("lib/app_helpers", function(exports, require, module) {
(function() {
  return (function() {
    var console, dummy, method, methods, _results;
    console = window.console = window.console || {};
    method = void 0;
    dummy = function() {};
    methods = 'assert,count,debug,dir,dirxml,error,exception, group,groupCollapsed,groupEnd,info,log,markTimeline, profile,profileEnd,time,timeEnd,trace,warn'.split(',');
    _results = [];
    while (method = methods.pop()) {
      _results.push(console[method] = console[method] || dummy);
    }
    return _results;
  })();
})();

});

require.register("lib/base_view", function(exports, require, module) {
var BaseView,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

module.exports = BaseView = (function(_super) {
  __extends(BaseView, _super);

  function BaseView() {
    return BaseView.__super__.constructor.apply(this, arguments);
  }

  BaseView.prototype.template = function() {};

  BaseView.prototype.initialize = function() {};

  BaseView.prototype.getRenderData = function() {
    var _ref;
    return {
      model: (_ref = this.model) != null ? _ref.toJSON() : void 0
    };
  };

  BaseView.prototype.render = function() {
    this.beforeRender();
    this.$el.html(this.template(this.getRenderData()));
    this.afterRender();
    return this;
  };

  BaseView.prototype.beforeRender = function() {};

  BaseView.prototype.afterRender = function() {};

  BaseView.prototype.destroy = function() {
    this.undelegateEvents();
    this.$el.removeData().unbind();
    this.remove();
    return Backbone.View.prototype.remove.call(this);
  };

  return BaseView;

})(Backbone.View);

});

require.register("lib/request", function(exports, require, module) {
exports.request = function(type, url, data, callback) {
  return $.ajax({
    type: type,
    url: url,
    data: data != null ? JSON.stringify(data) : null,
    contentType: "application/json",
    dataType: "json",
    success: function(data) {
      if (callback != null) {
        return callback(null, data);
      }
    },
    error: function(data) {
      if ((data != null) && (data.msg != null) && (callback != null)) {
        return callback(new Error(data.msg));
      } else if (callback != null) {
        return callback(new Error("Server error occured"));
      }
    }
  });
};

exports.get = function(url, callback) {
  return exports.request("GET", url, null, callback);
};

exports.post = function(url, data, callback) {
  return exports.request("POST", url, data, callback);
};

exports.put = function(url, data, callback) {
  return exports.request("PUT", url, data, callback);
};

exports.del = function(url, callback) {
  return exports.request("DELETE", url, null, callback);
};

});

require.register("lib/view_collection", function(exports, require, module) {
var BaseView, ViewCollection,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

BaseView = require('lib/base_view');

module.exports = ViewCollection = (function(_super) {
  __extends(ViewCollection, _super);

  function ViewCollection() {
    this.fetch = __bind(this.fetch, this);
    this.removeItem = __bind(this.removeItem, this);
    this.addItem = __bind(this.addItem, this);
    return ViewCollection.__super__.constructor.apply(this, arguments);
  }

  ViewCollection.prototype.itemview = null;

  ViewCollection.prototype.views = {};

  ViewCollection.prototype.template = function() {
    return '';
  };

  ViewCollection.prototype.itemViewOptions = function() {};

  ViewCollection.prototype.collectionEl = null;

  ViewCollection.prototype.onChange = function() {
    return this.$el.toggleClass('empty', _.size(this.views) === 0);
  };

  ViewCollection.prototype.appendView = function(view) {
    return this.$collectionEl.append(view.el);
  };

  ViewCollection.prototype.initialize = function() {
    ViewCollection.__super__.initialize.apply(this, arguments);
    this.views = {};
    this.listenTo(this.collection, "reset", this.onReset);
    this.listenTo(this.collection, "add", this.addItem);
    this.listenTo(this.collection, "remove", this.removeItem);
    return this.$collectionEl = $(this.collectionEl);
  };

  ViewCollection.prototype.render = function() {
    var id, view, _ref;
    _ref = this.views;
    for (id in _ref) {
      view = _ref[id];
      view.$el.detach();
    }
    return ViewCollection.__super__.render.apply(this, arguments);
  };

  ViewCollection.prototype.afterRender = function() {
    var id, view, _ref;
    _ref = this.views;
    for (id in _ref) {
      view = _ref[id];
      this.appendView(view.$el);
    }
    this.onReset(this.collection);
    return this.onChange(this.views);
  };

  ViewCollection.prototype.remove = function() {
    this.onReset([]);
    return ViewCollection.__super__.remove.apply(this, arguments);
  };

  ViewCollection.prototype.onReset = function(newcollection) {
    var id, view, _ref;
    _ref = this.views;
    for (id in _ref) {
      view = _ref[id];
      view.remove();
    }
    return newcollection.forEach(this.addItem);
  };

  ViewCollection.prototype.addItem = function(model) {
    var options, view;
    options = _.extend({}, {
      model: model
    }, this.itemViewOptions(model));
    view = new this.itemview(options);
    this.views[model.cid] = view.render();
    this.appendView(view);
    return this.onChange(this.views);
  };

  ViewCollection.prototype.removeItem = function(model) {
    this.views[model.cid].remove();
    delete this.views[model.cid];
    return this.onChange(this.views);
  };

  ViewCollection.prototype.fetch = function(options) {
    return this.collection.fetch(options);
  };

  return ViewCollection;

})(BaseView);

});

require.register("models/konnector", function(exports, require, module) {
var KonnectorModel,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

module.exports = KonnectorModel = (function(_super) {
  __extends(KonnectorModel, _super);

  function KonnectorModel() {
    return KonnectorModel.__super__.constructor.apply(this, arguments);
  }

  KonnectorModel.prototype.rootUrl = "konnectors/";

  return KonnectorModel;

})(Backbone.Model);

});

require.register("router", function(exports, require, module) {
var AppView, Router,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AppView = require('views/app_view');

module.exports = Router = (function(_super) {
  __extends(Router, _super);

  function Router() {
    return Router.__super__.constructor.apply(this, arguments);
  }

  Router.prototype.routes = {
    '': 'main'
  };

  Router.prototype.main = function() {
    var mainView;
    mainView = new AppView();
    return mainView.render();
  };

  return Router;

})(Backbone.Router);

});

require.register("views/app_view", function(exports, require, module) {
var AppView, BaseView, Konnectors,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

BaseView = require('../lib/base_view');

Konnectors = require('./konnectors');

module.exports = AppView = (function(_super) {
  __extends(AppView, _super);

  function AppView() {
    return AppView.__super__.constructor.apply(this, arguments);
  }

  AppView.prototype.el = 'body.application';

  AppView.prototype.template = require('./templates/home');

  AppView.prototype.afterRender = function() {
    var konnectors;
    konnectors = new Konnectors();
    konnectors.render();
    return konnectors.fetch();
  };

  return AppView;

})(BaseView);

});

require.register("views/konnector", function(exports, require, module) {
var BaseView, KonnectorView,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

BaseView = require('../lib/base_view');

module.exports = KonnectorView = (function(_super) {
  __extends(KonnectorView, _super);

  function KonnectorView() {
    this.selectPath = __bind(this.selectPath, this);
    this.onImportClicked = __bind(this.onImportClicked, this);
    this.afterRender = __bind(this.afterRender, this);
    return KonnectorView.__super__.constructor.apply(this, arguments);
  }

  KonnectorView.prototype.template = require('./templates/konnector');

  KonnectorView.prototype.className = 'konnector';

  KonnectorView.prototype.events = {
    "click .import-button": "onImportClicked"
  };

  KonnectorView.prototype.afterRender = function() {
    var fieldHtml, importInterval, intervals, isImporting, key, lastImport, name, selected, slug, val, value, values, _ref;
    slug = this.model.get('slug');
    lastImport = this.model.get('lastImport');
    isImporting = this.model.get('isImporting');
    this.$el.addClass("konnector-" + slug);
    if (isImporting) {
      this.$('.last-import').html('importing...');
    } else if (lastImport != null) {
      this.$('.last-import').html(moment(lastImport).format('LLL'));
    } else {
      this.$('.last-import').html("no import performed.");
    }
    values = this.model.get('fieldValues');
    if (values == null) {
      values = {};
    }
    _ref = this.model.get('fields');
    for (name in _ref) {
      val = _ref[name];
      if (values[name] == null) {
        values[name] = "";
      }
      fieldHtml = "<div class=\"field line\">\n<div><label for=\"" + slug + "-" + name + "-input\">" + name + "</label></div>";
      if (val === 'folder') {
        fieldHtml += "<div><select id=\"" + slug + "-" + name + "-input\" class=\"folder\"\n             value=\"" + values[name] + "\"></select></div>\n</div>";
      } else {
        fieldHtml += "<div><input id=\"" + slug + "-" + name + "-input\" type=\"" + val + "\"\n            value=\"" + values[name] + "\"/></div>\n</div>";
      }
      this.$('.fields').append(fieldHtml);
    }
    importInterval = this.model.get('importInterval');
    if (importInterval == null) {
      importInterval = '';
    }
    intervals = {
      none: "None",
      hour: "Every Hour",
      day: "Every Day",
      week: "Every Week",
      month: "Each month"
    };
    fieldHtml = "<div class=\"field line\">\n<div><label for=\"" + slug + "-autoimport-input\">Auto Import</label></div>\n<div><select id=\"" + slug + "-autoimport-input\" class=\"autoimport\">";
    for (key in intervals) {
      value = intervals[key];
      selected = importInterval === key ? 'selected' : '';
      fieldHtml += "<option value=\"" + key + "\" " + selected + ">" + value + "</option>";
    }
    fieldHtml += "\n</select>\n<span id=\"" + slug + "-first-import\">\n<span id=\"" + slug + "-first-import-text\">\n<a id=\"" + slug + "-first-import-link\" href=\"#\">Select a starting date</a></span>\n<span id=\"" + slug + "-first-import-date\"><span>Date</span>\n<input id=\"" + slug + "-import-date\" class=\"autoimport\" maxlength=\"8\" type=\"text\"></input>\n</span></span>\n</div>\n</div>";
    this.$('.fields').append(fieldHtml);
    if (this.$("#" + slug + "-autoimport-input").val() !== 'none') {
      this.$("#" + slug + "-first-import").show();
    } else {
      this.$("#" + slug + "-first-import").hide();
    }
    this.$("#" + slug + "-first-import-date").hide();
    this.$("#" + slug + "-import-date").datepicker({
      minDate: 1,
      dateFormat: "dd-mm-yy"
    });
    this.$("#" + slug + "-first-import-link").click((function(_this) {
      return function() {
        event.preventDefault();
        return _this.$("#" + slug + "-first-import-date").toggle();
      };
    })(this));
    return this.$("#" + slug + "-autoimport-input").change((function(_this) {
      return function() {
        if (_this.$("#" + slug + "-autoimport-input").val() !== 'none') {
          return _this.$("#" + slug + "-first-import").show();
        } else {
          return _this.$("#" + slug + "-first-import").hide();
        }
      };
    })(this));
  };

  KonnectorView.prototype.onImportClicked = function() {
    var fieldValues, importDate, importInterval, name, slug, val, _ref;
    fieldValues = {};
    slug = this.model.get('slug');
    importDate = $("#" + slug + "-import-date").val();
    fieldValues['date'] = importDate;
    _ref = this.model.get('fields');
    for (name in _ref) {
      val = _ref[name];
      fieldValues[name] = $("#" + slug + "-" + name + "-input").val();
    }
    this.model.set('fieldValues', fieldValues);
    importInterval = 'none';
    importInterval = $("#" + slug + "-autoimport-input").val();
    this.model.set('importInterval', importInterval);
    return this.model.save({
      success: (function(_this) {
        return function() {
          return alert("import succeeded");
        };
      })(this),
      error: (function(_this) {
        return function() {
          return alert("import failed");
        };
      })(this)
    });
  };

  KonnectorView.prototype.selectPath = function() {
    var name, slug, val, values, _ref, _results;
    slug = this.model.get('slug');
    _ref = this.model.get('fields');
    _results = [];
    for (name in _ref) {
      val = _ref[name];
      if (val === 'folder') {
        values = this.model.get('fieldValues');
        if (values == null) {
          values = {};
        }
        _results.push(this.$("#" + slug + "-" + name + "-input").val(values[name]));
      } else {
        _results.push(void 0);
      }
    }
    return _results;
  };

  return KonnectorView;

})(BaseView);

});

require.register("views/konnector_listener", function(exports, require, module) {
var Konnector, KonnectorListener,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Konnector = require('../models/konnector');

module.exports = KonnectorListener = (function(_super) {
  __extends(KonnectorListener, _super);

  function KonnectorListener() {
    return KonnectorListener.__super__.constructor.apply(this, arguments);
  }

  KonnectorListener.prototype.models = {
    konnector: Konnector
  };

  KonnectorListener.prototype.events = ['konnector.update'];

  KonnectorListener.prototype.onRemoteUpdate = function(model) {
    var isImporting, slug;
    isImporting = model.get('isImporting');
    slug = model.get('slug');
    if (isImporting) {
      return $(".konnector-" + slug + " .last-import").html('importing...');
    } else {
      return $(".konnector-" + slug + " .last-import").html(moment().format('LLL'));
    }
  };

  return KonnectorListener;

})(CozySocketListener);

});

require.register("views/konnectors", function(exports, require, module) {
var KonnectorListener, KonnectorView, KonnectorsCollection, KonnectorsView, ViewCollection, request,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

request = require('../lib/request');

ViewCollection = require('../lib/view_collection');

KonnectorsCollection = require('../collections/konnectors');

KonnectorView = require('./konnector');

KonnectorListener = require('./konnector_listener');

module.exports = KonnectorsView = (function(_super) {
  __extends(KonnectorsView, _super);

  function KonnectorsView() {
    return KonnectorsView.__super__.constructor.apply(this, arguments);
  }

  KonnectorsView.prototype.collectionEl = '#konnectors';

  KonnectorsView.prototype.collection = new KonnectorsCollection();

  KonnectorsView.prototype.itemview = KonnectorView;

  KonnectorsView.prototype.afterRender = function() {
    KonnectorsView.__super__.afterRender.apply(this, arguments);
    this.remoteChangeListener = new KonnectorListener();
    return this.remoteChangeListener.watch(this.collection);
  };

  KonnectorsView.prototype.fetch = function() {
    return this.collection.fetch({
      success: (function(_this) {
        return function() {
          return request.get('folders', function(err, paths) {
            var cid, konnector, path, _i, _len, _ref, _results;
            for (_i = 0, _len = paths.length; _i < _len; _i++) {
              path = paths[_i];
              $(".folder").append("<option value=\"" + path + "\">" + path + "</option>");
            }
            _ref = _this.views;
            _results = [];
            for (cid in _ref) {
              konnector = _ref[cid];
              _results.push(konnector.selectPath());
            }
            return _results;
          });
        };
      })(this)
    });
  };

  return KonnectorsView;

})(ViewCollection);

});

require.register("views/templates/home", function(exports, require, module) {
module.exports = function anonymous(locals, attrs, escape, rethrow, merge) {
attrs = attrs || jade.attrs; escape = escape || jade.escape; rethrow = rethrow || jade.rethrow; merge = merge || jade.merge;
var buf = [];
with (locals || {}) {
var interp;
buf.push('<div id="content"><div class="line clearfix"><img src="images/small_icon.png" class="right"/><h1>Konnectors</h1></div><div id="konnectors"></div></div>');
}
return buf.join("");
};
});

require.register("views/templates/konnector", function(exports, require, module) {
module.exports = function anonymous(locals, attrs, escape, rethrow, merge) {
attrs = attrs || jade.attrs; escape = escape || jade.escape; rethrow = rethrow || jade.rethrow; merge = merge || jade.merge;
var buf = [];
with (locals || {}) {
var interp;
buf.push('<!-- .konnector --><h2 class="name">' + escape((interp = model.name) == null ? '' : interp) + '</h2><div class="description">' + escape((interp = model.description) == null ? '' : interp) + ' </div><div class="fields"></div><div class="buttons"> <button class="import-button">import</button></div><div class="status">' + escape((interp = status) == null ? '' : interp) + '</div><div class="infos"><div class="date"> <span class="label">Last import:&nbsp;</span><span class="last-import"></span></div><div class="datas">Imported data:&nbsp;');
// iterate model.modelNames
;(function(){
  if ('number' == typeof model.modelNames.length) {

    for (var $index = 0, $$l = model.modelNames.length; $index < $$l; $index++) {
      var name = model.modelNames[$index];

buf.push('<a');
buf.push(attrs({ 'href':("/apps/databrowser/#search/all/" + (name) + ""), 'target':("_blank") }, {"href":true,"target":true}));
buf.push('> \n' + escape((interp = name) == null ? '' : interp) + '</a>&nbsp;');
    }

  } else {
    var $$l = 0;
    for (var $index in model.modelNames) {
      $$l++;      var name = model.modelNames[$index];

buf.push('<a');
buf.push(attrs({ 'href':("/apps/databrowser/#search/all/" + (name) + ""), 'target':("_blank") }, {"href":true,"target":true}));
buf.push('> \n' + escape((interp = name) == null ? '' : interp) + '</a>&nbsp;');
    }

  }
}).call(this);

buf.push('</div></div>');
}
return buf.join("");
};
});


//# sourceMappingURL=app.js.map