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

  KonnectorsCollection.prototype.comparator = function(a, b) {
    if (a.isConfigured() && !b.isConfigured()) {
      return -1;
    } else if (!a.isConfigured() && b.isConfigured()) {
      return 1;
    } else if (a.get('name') > b.get('name')) {
      return 1;
    } else if (a.get('name') < b.get('name')) {
      return -1;
    } else {
      return 0;
    }
  };

  return KonnectorsCollection;

})(Backbone.Collection);

});

;require.register("initialize", function(exports, require, module) {
var AppView, KonnectorListener, KonnectorsCollection, Router, request;

request = require('./lib/request');

KonnectorListener = require('./realtime');

KonnectorsCollection = require('../collections/konnectors');

AppView = require('./views/app_view');

Router = require('./router');

$(function() {
  var appView, e, initKonnectors, konnectors, locale, locales, polyglot, remoteChangeListener;
  locale = window.locale;
  polyglot = new Polyglot();
  try {
    locales = require("locales/" + locale);
  } catch (_error) {
    e = _error;
    locale = 'en';
    locales = require('locales/en');
  }
  polyglot.extend(locales);
  window.t = polyglot.t.bind(polyglot);
  initKonnectors = window.initKonnectors || [];
  konnectors = new KonnectorsCollection(initKonnectors);
  remoteChangeListener = new KonnectorListener();
  remoteChangeListener.watch(konnectors);
  appView = new AppView({
    collection: konnectors
  });
  appView.render();
  window.router = new Router({
    appView: appView
  });
  return request.get('folders', function(err, paths) {
    appView.setFolders(paths);
    return Backbone.history.start();
  });
});

});

;require.register("lib/base_view", function(exports, require, module) {
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

;require.register("lib/request", function(exports, require, module) {
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

;require.register("lib/view_collection", function(exports, require, module) {
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
    this.listenTo(this.collection, 'reset', this.onReset);
    this.listenTo(this.collection, 'add', this.addItem);
    this.listenTo(this.collection, 'remove', this.removeItem);
    this.listenTo(this.collection, 'sort', this.render);
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

;require.register("locales/en", function(exports, require, module) {
module.exports = {
  'bad credentials': 'Bad Credentials',
  'no bills retrieved': 'No bills retrieved',
  'key not found': 'Key not found',
  'last import:': 'Last import:',
  'save and import': 'Save and import',
  'auto import': 'Automatic import',
  'imported data:': 'Imported data:',
  'importing...': 'importing...',
  'no import performed': 'No import performed',
  'firstname': 'Firstname',
  'lastname': 'Lastname',
  'login': 'Login',
  'password': 'Password',
  'email': 'Email',
  'accessToken': 'Access token',
  'accessTokenSecret': 'Access token secret',
  'consumerKey': 'Consumer Key',
  'consumerSecret': 'Consumer Secret',
  'apikey': 'Api key',
  'phoneNumber': 'Phone number',
  'folderPath': 'Folder path',
  'none': 'None',
  'every hour': 'Every hour',
  'every day': 'Every day',
  'every week': 'Every week',
  'each month': 'Each month',
  'date format': 'LLL',
  'home headline': "With Konnectors you can retrieve many data and save them into your Cozy.\nFrom your phone bills to your connected scale, or your tweets. Configure the connectors you are interested in:",
  'home config step 1': "Select a connector in the menu on the left",
  'home config step 2': "Follow the instructions to configure it",
  'home config step 3': "Your data are retrieved and saved into your Cozy",
  'home more info': "More information:",
  'home help step 1': "You must manually trigger the import, except if you enable the auto-import.",
  'home help step 2': "Disable the auto-stop feature for the Konnector application in your Cozy, otherwise the auto-import won't work.",
  'notification import success': 'Konnector %{name}: data have been successfully imported',
  'notification import error': 'Konnector %{name}: an error occurred during import of data',
  'error occurred during import.': 'An error occurred during the last import.',
  'error occurred during import:': 'An error occurred during the last import:'
};

});

;require.register("locales/fr", function(exports, require, module) {
module.exports = {
  'bad credentials': 'Mauvais identifiants',
  'no bills retrieved': 'Pas de facture trouvées',
  'key not found': 'Clé non trouvée',
  'last import:': 'Dernière importation :',
  'save and import': 'Sauvegarder et importer',
  'auto import': 'Importation automatique',
  'imported data:': 'Données importées :',
  'importing...': 'importation en cours...',
  'no import performed': "Pas d'importation effectuée",
  'firstname': 'Prénom',
  'lastname': 'Nom',
  'login': 'Identifiant',
  'password': 'Mot de passe',
  'email': 'Mail',
  'accessToken': 'Access token',
  'accessTokenSecret': 'Access token secret',
  'consumerKey': 'Consumer Key',
  'consumerSecret': 'Consumer Secret',
  'apikey': 'Api key',
  'phoneNumber': 'Numéro de téléphone',
  'folderPath': 'Chemin du dossier',
  'none': 'Aucun',
  'every hour': 'Toutes les heures',
  'every day': 'Tous les jours',
  'every week': 'Toutes les semaines',
  'each month': 'Tous les mois',
  'date format': 'DD/MM/YYYY [à] HH[h]mm',
  'home headline': "Konnectors vous permet de récupérer de nombreuses données et de les intégrer votre Cozy.\nDe vos factures de téléphone aux données de votre balance connectée en passant par vos tweets. Configurez les connecteurs qui vous intéressent :",
  'home config step 1': "Sélectionnez un connecteur dans le menu à gauche",
  'home config step 2': "Suivez les instructions pour le configurer",
  'home config step 3': "Vos données sont récupérées et intégrer à votre Cozy",
  'home more info': "Quelques informations supplémentaires :",
  'home help step 1': "Vous devez manuellement déclencher l'importation sauf si vous avez activé l'importation automatique",
  'home help step 2': "Désactivez la fonction d'auto-stop pour l'application Konnectors dans votre Cozy, sinon l'importation automatique ne fonctionnera pas.",
  'notification import success': 'Konnector %{name}: les données ont été importées avec succès',
  'notification import error': "Konnector %{name}: une erreur est survenue pendant l'importation des données",
  'error occurred during import.': 'Une erreur est survenue lors de la dernière importation.',
  'error occurred during import:': 'Une erreur est survenue lors de la dernière importation :'
};

});

;require.register("models/konnector", function(exports, require, module) {
var KonnectorModel,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

module.exports = KonnectorModel = (function(_super) {
  __extends(KonnectorModel, _super);

  function KonnectorModel() {
    return KonnectorModel.__super__.constructor.apply(this, arguments);
  }

  KonnectorModel.prototype.rootUrl = "konnectors/";

  KonnectorModel.prototype.isConfigured = function() {
    var field, fieldValue, fieldValues, fields, noEmptyValue, numFieldValues, numFields, _ref;
    fieldValues = this.get('fieldValues') || {};
    fields = this.get('fields');
    numFieldValues = Object.keys(fieldValues).length;
    numFields = Object.keys(fields).length;
    noEmptyValue = true;
    for (field in fields) {
      fieldValue = fields[field];
      noEmptyValue = noEmptyValue && ((_ref = fieldValues[field]) != null ? _ref.length : void 0) > 0;
    }
    return numFieldValues >= numFields && noEmptyValue;
  };

  return KonnectorModel;

})(Backbone.Model);

});

;require.register("realtime", function(exports, require, module) {
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
    var formattedDate, isImporting, lastImport, slug;
    isImporting = model.get('isImporting');
    slug = model.get('slug');
    lastImport = model.get('lastImport');
    formattedDate = moment(lastImport).format(t('date format'));
    if (isImporting) {
      return $(".konnector-" + slug + " .last-import").html(t('importing...'));
    } else if (lastImport != null) {
      return $(".konnector-" + slug + " .last-import").html(formattedDate);
    } else {
      return $(".konnector-" + slug + " .last-import").html(t('no import performed'));
    }
  };

  return KonnectorListener;

})(CozySocketListener);

});

;require.register("router", function(exports, require, module) {
var Router,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

module.exports = Router = (function(_super) {
  __extends(Router, _super);

  function Router() {
    return Router.__super__.constructor.apply(this, arguments);
  }

  Router.prototype.routes = {
    '': 'main',
    'konnector/:slug': 'konnector'
  };

  Router.prototype.initialize = function(options) {
    Router.__super__.initialize.call(this);
    return this.appView = options.appView;
  };

  Router.prototype.main = function() {
    return this.appView.showDefault();
  };

  Router.prototype.konnector = function(slug) {
    return this.appView.showKonnector(slug);
  };

  return Router;

})(Backbone.Router);

});

;require.register("views/app_view", function(exports, require, module) {
var AppView, BaseView, KonnectorView, MenuView,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

BaseView = require('../lib/base_view');

KonnectorView = require('./konnector');

MenuView = require('./menu');

module.exports = AppView = (function(_super) {
  __extends(AppView, _super);

  function AppView() {
    return AppView.__super__.constructor.apply(this, arguments);
  }

  AppView.prototype.el = 'body';

  AppView.prototype.template = require('./templates/home');

  AppView.prototype.defaultTemplate = require('./templates/default');

  AppView.prototype.events = {
    'click #menu-toggler': 'toggleMenu'
  };

  AppView.prototype.afterRender = function() {
    this.container = this.$('.container');
    this.menuView = new MenuView({
      collection: this.collection
    });
    return this.menuView.render();
  };

  AppView.prototype.showDefault = function() {
    this.menuView.unselectAll();
    this.container.html(this.defaultTemplate());
    return this.hideMenu();
  };

  AppView.prototype.showKonnector = function(slug) {
    var defaultView, el, konnector;
    konnector = this.collection.findWhere({
      slug: slug
    });
    if (this.konnectorView != null) {
      this.konnectorView.destroy();
    }
    defaultView = this.container.find('#default');
    if (defaultView.length > 0) {
      this.$('#menu-toggler').remove();
      defaultView.remove();
    }
    if (konnector != null) {
      this.konnectorView = new KonnectorView({
        model: konnector,
        paths: this.paths
      });
      el = this.konnectorView.render().$el;
      this.$('.container').append(el);
      this.menuView.unselectAll();
      this.menuView.selectItem(konnector.cid);
      return this.hideMenu();
    } else {
      return window.router.navigate('', true);
    }
  };

  AppView.prototype.setFolders = function(paths) {
    return this.paths = paths;
  };

  AppView.prototype.toggleMenu = function() {
    return this.$('#menu').toggleClass('active');
  };

  AppView.prototype.hideMenu = function() {
    return this.$('#menu').removeClass('active');
  };

  return AppView;

})(BaseView);

});

;require.register("views/konnector", function(exports, require, module) {
var BaseView, KonnectorView,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

BaseView = require('../lib/base_view');

module.exports = KonnectorView = (function(_super) {
  __extends(KonnectorView, _super);

  function KonnectorView() {
    this.afterRender = __bind(this.afterRender, this);
    return KonnectorView.__super__.constructor.apply(this, arguments);
  }

  KonnectorView.prototype.template = require('./templates/konnector');

  KonnectorView.prototype.className = 'konnector';

  KonnectorView.prototype.events = {
    "click #import-button": "onImportClicked"
  };

  KonnectorView.prototype.initialize = function(options) {
    KonnectorView.__super__.initialize.call(this, options);
    this.paths = options.paths || [];
    return this.listenTo(this.model, 'change', this.render);
  };

  KonnectorView.prototype.afterRender = function() {
    var fieldHtml, formattedDate, importInterval, intervals, isImporting, key, lastAutoImport, lastImport, name, path, selected, slug, val, value, values, _i, _len, _ref, _ref1;
    slug = this.model.get('slug');
    lastImport = this.model.get('lastImport');
    isImporting = this.model.get('isImporting');
    lastAutoImport = this.model.get('lastAutoImport');
    this.error = this.$('.error');
    if ((this.model.get('errorMessage') == null) || isImporting) {
      this.error.hide();
    }
    this.$el.addClass("konnector-" + slug);
    if (isImporting) {
      this.$('.last-import').html(t('importing...'));
      this.disableImportButton();
    } else if (lastImport != null) {
      formattedDate = moment(lastImport).format(t('date format'));
      this.$('.last-import').html(formattedDate);
      this.enableImportButton();
    } else {
      this.$('.last-import').html(t("no import performed"));
      this.enableImportButton();
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
      fieldHtml = "<div class=\"field line\">\n<div><label for=\"" + slug + "-" + name + "-input\">" + (t(name)) + "</label></div>";
      if (val === 'folder') {
        fieldHtml += "<div><select id=\"" + slug + "-" + name + "-input\" class=\"folder\"\">";
        _ref1 = this.paths;
        for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
          path = _ref1[_i];
          if (path === values[name]) {
            fieldHtml += "<option selected value=\"" + path + "\">" + path + "</option>";
          } else {
            fieldHtml += "<option value=\"" + path + "\">" + path + "</option>";
          }
        }
        fieldHtml += "</select></div></div>";
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
      none: t("none"),
      hour: t("every hour"),
      day: t("every day"),
      week: t("every week"),
      month: t("each month")
    };
    fieldHtml = "<div class=\"field line\">\n<div><label for=\"" + slug + "-autoimport-input\">" + (t('auto import')) + "</label></div>\n<div><select id=\"" + slug + "-autoimport-input\" class=\"autoimport\">";
    for (key in intervals) {
      value = intervals[key];
      selected = importInterval === key ? 'selected' : '';
      fieldHtml += "<option value=\"" + key + "\" " + selected + ">" + value + "</option>";
    }
    fieldHtml += "\n</select>\n<span id=\"" + slug + "-first-import\">\n<span id=\"" + slug + "-first-import-text\">\n<a id=\"" + slug + "-first-import-link\" href=\"#\">Select a starting date</a></span>\n<span id=\"" + slug + "-first-import-date\"><span>From</span>\n<input id=\"" + slug + "-import-date\" class=\"autoimport\" maxlength=\"8\" type=\"text\"></input>\n</span></span>\n</div>\n</div>";
    this.$('.fields').append(fieldHtml);
    this.$("#" + slug + "-first-import-date").hide();
    this.$("#" + slug + "-import-date").datepicker({
      minDate: 1,
      dateFormat: "dd-mm-yy"
    });
    if (this.$("#" + slug + "-autoimport-input").val() !== 'none' && this.$("#" + slug + "-autoimport-input").val() !== 'hour') {
      if ((lastAutoImport != null) && moment(lastAutoImport).valueOf() > moment().valueOf()) {
        this.$("#" + slug + "-first-import-date").show();
        this.$("#" + slug + "-first-import-text").hide();
        this.$("#" + slug + "-import-date").val(moment(lastAutoImport).format('DD-MM-YYYY'));
      } else {
        this.$("#" + slug + "-first-import").show();
      }
    } else {
      this.$("#" + slug + "-first-import").hide();
    }
    this.$("#" + slug + "-first-import-link").click((function(_this) {
      return function(event) {
        event.preventDefault();
        _this.$("#" + slug + "-first-import-date").show();
        return _this.$("#" + slug + "-first-import-text").hide();
      };
    })(this));
    return this.$("#" + slug + "-autoimport-input").change((function(_this) {
      return function() {
        if (_this.$("#" + slug + "-autoimport-input").val() !== 'none' && _this.$("#" + slug + "-autoimport-input").val() !== 'hour') {
          return _this.$("#" + slug + "-first-import").show();
        } else {
          return _this.$("#" + slug + "-first-import").hide();
        }
      };
    })(this));
  };

  KonnectorView.prototype.disableImportButton = function() {
    this.$('#import-button').attr('aria-busy', true);
    return this.$('#import-button').attr('aria-disabled', true);
  };

  KonnectorView.prototype.enableImportButton = function() {
    this.$('#import-button').attr('aria-busy', false);
    return this.$('#import-button').attr('aria-disabled', false);
  };

  KonnectorView.prototype.onImportClicked = function() {
    var data, fieldValues, importDate, importInterval, name, slug, val, _ref;
    if (!this.model.get('isImporting')) {
      this.$('.error').hide();
      fieldValues = {};
      slug = this.model.get('slug');
      fieldValues['date'] = importDate;
      _ref = this.model.get('fields');
      for (name in _ref) {
        val = _ref[name];
        fieldValues[name] = $("#" + slug + "-" + name + "-input").val();
      }
      importInterval = $("#" + slug + "-autoimport-input").val();
      importDate = $("#" + slug + "-import-date").val();
      this.disableImportButton();
      data = {
        fieldValues: fieldValues,
        importInterval: importInterval
      };
      return this.model.save(data, {
        success: (function(_this) {
          return function(model, success) {};
        })(this),
        error: (function(_this) {
          return function(model, err) {
            if (err.status >= 400 && err.status !== 504) {
              _this.$('.error .message').html(t(err.responseText));
              return _this.$('.error').show();
            }
          };
        })(this)
      });
    }
  };

  return KonnectorView;

})(BaseView);

});

;require.register("views/menu", function(exports, require, module) {
var KonnectorsView, MenuItemView, ViewCollection,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

ViewCollection = require('../lib/view_collection');

MenuItemView = require('./menu_item');

module.exports = KonnectorsView = (function(_super) {
  __extends(KonnectorsView, _super);

  function KonnectorsView() {
    return KonnectorsView.__super__.constructor.apply(this, arguments);
  }

  KonnectorsView.prototype.collectionEl = '#konnectors';

  KonnectorsView.prototype.itemview = MenuItemView;

  KonnectorsView.prototype.initialize = function(options) {
    KonnectorsView.__super__.initialize.call(this, options);
    this.listenTo(this.collection, 'change', this.collection.sort.bind(this.collection));
    return this.listenTo(this.collection, 'change', this.render);
  };

  KonnectorsView.prototype.afterRender = function() {
    KonnectorsView.__super__.afterRender.call(this);
    return this.selectItem(this.selectedCid);
  };

  KonnectorsView.prototype.selectItem = function(modelCid) {
    var view;
    this.selectedCid = modelCid;
    view = this.views[modelCid];
    if (view != null) {
      return view.select();
    }
  };

  KonnectorsView.prototype.unselectAll = function() {
    var index, view, _ref, _results;
    _ref = this.views;
    _results = [];
    for (index in _ref) {
      view = _ref[index];
      _results.push(view.unselect());
    }
    return _results;
  };

  return KonnectorsView;

})(ViewCollection);

});

;require.register("views/menu_item", function(exports, require, module) {
var BaseView, MenuItemView,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

BaseView = require('../lib/base_view');

module.exports = MenuItemView = (function(_super) {
  __extends(MenuItemView, _super);

  function MenuItemView() {
    return MenuItemView.__super__.constructor.apply(this, arguments);
  }

  MenuItemView.prototype.tagName = 'li';

  MenuItemView.prototype.template = require('./templates/menu_item');

  MenuItemView.prototype.initialize = function(options) {
    MenuItemView.__super__.initialize.call(this, options);
    return this.listenTo(this.model, 'change', this.render);
  };

  MenuItemView.prototype.getRenderData = function() {
    var formattedDate, lastImport;
    lastImport = this.model.get('lastImport');
    if (this.model.isConfigured() && (lastImport != null)) {
      formattedDate = moment(lastImport).format(t('date format'));
      lastImport = "" + (t('last import:')) + "  " + formattedDate;
    } else if (this.model.isConfigured()) {
      lastImport = t("no import performed");
    } else {
      lastImport = "";
    }
    return _.extend({}, MenuItemView.__super__.getRenderData.call(this), {
      lastImport: lastImport
    });
  };

  MenuItemView.prototype.afterRender = function() {
    if (this.model.isConfigured()) {
      return this.$el.addClass('configured');
    }
  };

  MenuItemView.prototype.select = function() {
    return this.$el.addClass('selected');
  };

  MenuItemView.prototype.unselect = function() {
    return this.$el.removeClass('selected');
  };

  return MenuItemView;

})(BaseView);

});

;require.register("views/templates/default", function(exports, require, module) {
module.exports = function anonymous(locals, attrs, escape, rethrow, merge) {
attrs = attrs || jade.attrs; escape = escape || jade.escape; rethrow = rethrow || jade.rethrow; merge = merge || jade.merge;
var buf = [];
with (locals || {}) {
var interp;
buf.push('<div id="menu-toggler"><div class="fa fa-bars"></div></div><div id="default">');
var __val__ = t('home headline')
buf.push(escape(null == __val__ ? "" : __val__));
buf.push('<ul><li>');
var __val__ = t('home config step 1')
buf.push(escape(null == __val__ ? "" : __val__));
buf.push('</li><li>');
var __val__ = t('home config step 2')
buf.push(escape(null == __val__ ? "" : __val__));
buf.push('</li><li>');
var __val__ = t('home config step 3')
buf.push(escape(null == __val__ ? "" : __val__));
buf.push('</li></ul>' + escape((interp = t('home more info')) == null ? '' : interp) + '<ul><li>');
var __val__ = t('home help step 1')
buf.push(escape(null == __val__ ? "" : __val__));
buf.push('</li><li>');
var __val__ = t('home help step 2')
buf.push(escape(null == __val__ ? "" : __val__));
buf.push('</li></ul></div>');
}
return buf.join("");
};
});

;require.register("views/templates/home", function(exports, require, module) {
module.exports = function anonymous(locals, attrs, escape, rethrow, merge) {
attrs = attrs || jade.attrs; escape = escape || jade.escape; rethrow = rethrow || jade.rethrow; merge = merge || jade.merge;
var buf = [];
with (locals || {}) {
var interp;
buf.push('<div id="menu"><h1><a href="#">Konnectors</a></h1><ul id="konnectors"></ul></div><div class="container"></div>');
}
return buf.join("");
};
});

;require.register("views/templates/konnector", function(exports, require, module) {
module.exports = function anonymous(locals, attrs, escape, rethrow, merge) {
attrs = attrs || jade.attrs; escape = escape || jade.escape; rethrow = rethrow || jade.rethrow; merge = merge || jade.merge;
var buf = [];
with (locals || {}) {
var interp;
buf.push('<!-- .konnector --><h2 class="name"><div id="menu-toggler"><div class="fa fa-bars"></div></div><span>' + escape((interp = model.name) == null ? '' : interp) + '</span></h2><div class="description">' + escape((interp = model.description) == null ? '' : interp) + '</div><div class="fields"></div><div class="buttons"><button id="import-button">' + escape((interp = t('save and import')) == null ? '' : interp) + '</button></div><div class="error"><span class="error">');
var __val__ = t('error occurred during import:') + ' '
buf.push(escape(null == __val__ ? "" : __val__));
buf.push('<span class="message">');
var __val__ = t(model.errorMessage)
buf.push(escape(null == __val__ ? "" : __val__));
buf.push('</span></span></div><div class="status">' + escape((interp = status) == null ? '' : interp) + '</div><div class="infos"><div class="date"><span class="label">' + escape((interp = t('last import:')) == null ? '' : interp) + '&nbsp;</span><span class="last-import"></span></div><div class="datas">' + escape((interp = t('imported data:')) == null ? '' : interp) + '&nbsp;');
// iterate model.modelNames
;(function(){
  if ('number' == typeof model.modelNames.length) {

    for (var $index = 0, $$l = model.modelNames.length; $index < $$l; $index++) {
      var name = model.modelNames[$index];

buf.push('<a');
buf.push(attrs({ 'href':("/apps/databrowser/#search/all/" + (name) + ""), 'target':("_blank") }, {"href":true,"target":true}));
buf.push('>' + escape((interp = name) == null ? '' : interp) + '</a>&nbsp;');
    }

  } else {
    var $$l = 0;
    for (var $index in model.modelNames) {
      $$l++;      var name = model.modelNames[$index];

buf.push('<a');
buf.push(attrs({ 'href':("/apps/databrowser/#search/all/" + (name) + ""), 'target':("_blank") }, {"href":true,"target":true}));
buf.push('>' + escape((interp = name) == null ? '' : interp) + '</a>&nbsp;');
    }

  }
}).call(this);

buf.push('</div></div>');
}
return buf.join("");
};
});

;require.register("views/templates/menu_item", function(exports, require, module) {
module.exports = function anonymous(locals, attrs, escape, rethrow, merge) {
attrs = attrs || jade.attrs; escape = escape || jade.escape; rethrow = rethrow || jade.rethrow; merge = merge || jade.merge;
var buf = [];
with (locals || {}) {
var interp;
buf.push('<a');
buf.push(attrs({ 'href':("#konnector/" + (model.slug) + "") }, {"href":true}));
buf.push('><span class="name">');
var __val__ = model.name
buf.push(escape(null == __val__ ? "" : __val__));
buf.push('</span>');
 if(lastImport != null && lastImport.length > 0)
{
buf.push('<span class="last-import">');
var __val__ = lastImport
buf.push(escape(null == __val__ ? "" : __val__));
buf.push('</span>');
}
 if (model.isImporting === true)
{
buf.push('<div class="spinholder"><img src="images/spinner.svg"/></div>');
}
 else if (model.errorMessage != null)
{
buf.push('<i');
buf.push(attrs({ 'title':(t('error occurred during import.')), "class": ('fa') + ' ' + ('fa-warning') }, {"title":true}));
buf.push('></i>');
}
buf.push('</a>');
}
return buf.join("");
};
});

;
//# sourceMappingURL=app.js.map