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
      return globals.require(absolute);
    };
  };

  var initModule = function(name, definition) {
    var module = {id: name, exports: {}};
    definition(module.exports, localRequire(name), module);
    var exports = cache[name] = module.exports;
    return exports;
  };

  var require = function(name) {
    var path = expand(name, '.');

    if (has(cache, path)) return cache[path];
    if (has(modules, path)) return initModule(path, modules[path]);

    var dirIndex = expand(path, './index');
    if (has(cache, dirIndex)) return cache[dirIndex];
    if (has(modules, dirIndex)) return initModule(dirIndex, modules[dirIndex]);

    throw new Error('Cannot find module "' + name + '"');
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

  globals.require = require;
  globals.require.define = define;
  globals.require.register = define;
  globals.require.brunch = true;
})();

window.require.register("application", function(exports, require, module) {
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
window.require.register("collections/konnectors", function(exports, require, module) {
  var KonnectorsCollection, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  module.exports = KonnectorsCollection = (function(_super) {
    __extends(KonnectorsCollection, _super);

    function KonnectorsCollection() {
      _ref = KonnectorsCollection.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    KonnectorsCollection.prototype.model = require('../models/konnector');

    KonnectorsCollection.prototype.url = 'konnectors/';

    return KonnectorsCollection;

  })(Backbone.Collection);
  
});
window.require.register("initialize", function(exports, require, module) {
  var app;

  app = require('application');

  $(function() {
    require('lib/app_helpers');
    return app.initialize();
  });
  
});
window.require.register("lib/app_helpers", function(exports, require, module) {
  (function() {
    return (function() {
      var console, dummy, method, methods, _results;
      console = window.console = window.console || {};
      method = void 0;
      dummy = function() {};
      methods = 'assert,count,debug,dir,dirxml,error,exception,\
                   group,groupCollapsed,groupEnd,info,log,markTimeline,\
                   profile,profileEnd,time,timeEnd,trace,warn'.split(',');
      _results = [];
      while (method = methods.pop()) {
        _results.push(console[method] = console[method] || dummy);
      }
      return _results;
    })();
  })();
  
});
window.require.register("lib/base_view", function(exports, require, module) {
  var BaseView, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  module.exports = BaseView = (function(_super) {
    __extends(BaseView, _super);

    function BaseView() {
      _ref = BaseView.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    BaseView.prototype.template = function() {};

    BaseView.prototype.initialize = function() {};

    BaseView.prototype.getRenderData = function() {
      var _ref1;
      return {
        model: (_ref1 = this.model) != null ? _ref1.toJSON() : void 0
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
window.require.register("lib/view_collection", function(exports, require, module) {
  var BaseView, ViewCollection, _ref,
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
      _ref = ViewCollection.__super__.constructor.apply(this, arguments);
      return _ref;
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
      var id, view, _ref1;
      _ref1 = this.views;
      for (id in _ref1) {
        view = _ref1[id];
        view.$el.detach();
      }
      return ViewCollection.__super__.render.apply(this, arguments);
    };

    ViewCollection.prototype.afterRender = function() {
      var id, view, _ref1;
      _ref1 = this.views;
      for (id in _ref1) {
        view = _ref1[id];
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
      var id, view, _ref1;
      _ref1 = this.views;
      for (id in _ref1) {
        view = _ref1[id];
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
window.require.register("models/konnector", function(exports, require, module) {
  var KonnectorModel, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  module.exports = KonnectorModel = (function(_super) {
    __extends(KonnectorModel, _super);

    function KonnectorModel() {
      _ref = KonnectorModel.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    KonnectorModel.prototype.rootUrl = "konnectors/";

    return KonnectorModel;

  })(Backbone.Model);
  
});
window.require.register("router", function(exports, require, module) {
  var AppView, Router, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  AppView = require('views/app_view');

  module.exports = Router = (function(_super) {
    __extends(Router, _super);

    function Router() {
      _ref = Router.__super__.constructor.apply(this, arguments);
      return _ref;
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
window.require.register("views/app_view", function(exports, require, module) {
  var AppView, BaseView, Konnectors, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  BaseView = require('../lib/base_view');

  Konnectors = require('./konnectors');

  module.exports = AppView = (function(_super) {
    __extends(AppView, _super);

    function AppView() {
      _ref = AppView.__super__.constructor.apply(this, arguments);
      return _ref;
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
window.require.register("views/konnector", function(exports, require, module) {
  var BaseView, KonnectorView, _ref,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  BaseView = require('../lib/base_view');

  module.exports = KonnectorView = (function(_super) {
    __extends(KonnectorView, _super);

    function KonnectorView() {
      this.onImportClicked = __bind(this.onImportClicked, this);
      this.afterRender = __bind(this.afterRender, this);
      _ref = KonnectorView.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    KonnectorView.prototype.template = require('./templates/konnector');

    KonnectorView.prototype.className = 'konnector';

    KonnectorView.prototype.events = {
      "click .import-button": "onImportClicked"
    };

    KonnectorView.prototype.afterRender = function() {
      var isImporting, lastImport, name, val, values, _ref1, _results;
      this.$el.addClass("konnector-" + (this.model.get('slug')));
      lastImport = this.model.get('lastImport');
      isImporting = this.model.get('isImporting');
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
      _ref1 = this.model.get('fields');
      _results = [];
      for (name in _ref1) {
        val = _ref1[name];
        if (values[name] == null) {
          values[name] = "";
        }
        _results.push(this.$('.fields').append("<div class=\"field line\">\n<div><label for=\"" + name + "-input\">" + name + "</label></div>\n<div><input class=\"" + name + "-input\" type=\"" + val + "\"\n            value=\"" + values[name] + "\"/></div>\n</div>"));
      }
      return _results;
    };

    KonnectorView.prototype.onImportClicked = function() {
      var fieldValues, name, val, _ref1,
        _this = this;
      fieldValues = {};
      _ref1 = this.model.get('fields');
      for (name in _ref1) {
        val = _ref1[name];
        fieldValues[name] = $("." + name + "-input").val();
      }
      this.model.set('fieldValues', fieldValues);
      return this.model.save({
        success: function() {
          return alert("import succeeded");
        },
        error: function() {
          return alert("import failed");
        }
      });
    };

    return KonnectorView;

  })(BaseView);
  
});
window.require.register("views/konnector_listener", function(exports, require, module) {
  var Konnector, KonnectorListener, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Konnector = require('../models/konnector');

  module.exports = KonnectorListener = (function(_super) {
    __extends(KonnectorListener, _super);

    function KonnectorListener() {
      _ref = KonnectorListener.__super__.constructor.apply(this, arguments);
      return _ref;
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
window.require.register("views/konnectors", function(exports, require, module) {
  var KonnectorListener, KonnectorView, KonnectorsCollection, KonnectorsView, ViewCollection, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  ViewCollection = require('../lib/view_collection');

  KonnectorsCollection = require('../collections/konnectors');

  KonnectorView = require('./konnector');

  KonnectorListener = require('./konnector_listener');

  module.exports = KonnectorsView = (function(_super) {
    __extends(KonnectorsView, _super);

    function KonnectorsView() {
      _ref = KonnectorsView.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    KonnectorsView.prototype.collectionEl = '#konnectors';

    KonnectorsView.prototype.collection = new KonnectorsCollection();

    KonnectorsView.prototype.itemview = KonnectorView;

    KonnectorsView.prototype.afterRender = function() {
      KonnectorsView.__super__.afterRender.apply(this, arguments);
      this.remoteChangeListener = new KonnectorListener();
      return this.remoteChangeListener.watch(this.collection);
    };

    return KonnectorsView;

  })(ViewCollection);
  
});
window.require.register("views/templates/home", function(exports, require, module) {
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
window.require.register("views/templates/konnector", function(exports, require, module) {
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
