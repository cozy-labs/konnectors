/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	var AppView, FolderCollection, KonnectorCollection, KonnectorListener, Router, request;
	
	request = __webpack_require__(1);
	
	KonnectorListener = __webpack_require__(2);
	
	KonnectorCollection = __webpack_require__(5);
	
	FolderCollection = __webpack_require__(6);
	
	AppView = __webpack_require__(7);
	
	Router = __webpack_require__(19);
	
	$(function() {
	  var appView, e, error, folders, initFolders, initKonnectors, konnectors, locale, locales, polyglot, remoteChangeListener;
	  locale = window.locale;
	  polyglot = new Polyglot();
	  try {
	    locales = __webpack_require__(20)("./" + locale);
	  } catch (error) {
	    e = error;
	    locale = 'en';
	    locales = __webpack_require__(21);
	  }
	  polyglot.extend(locales);
	  window.t = polyglot.t.bind(polyglot);
	  initKonnectors = window.initKonnectors || [];
	  initFolders = window.initFolders || [];
	  konnectors = new KonnectorCollection(initKonnectors);
	  folders = new FolderCollection(initFolders);
	  remoteChangeListener = new KonnectorListener();
	  remoteChangeListener.watch(konnectors);
	  remoteChangeListener.watch(folders);
	  appView = new AppView({
	    collection: konnectors,
	    folders: folders
	  });
	  appView.render();
	  window.router = new Router({
	    appView: appView
	  });
	  return Backbone.history.start();
	});


/***/ },
/* 1 */
/***/ function(module, exports) {

	var request;
	
	module.exports = request = {
	  request: function(type, url, data, callback) {
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
	  },
	  get: function(url, callback) {
	    return request.request("GET", url, null, callback);
	  },
	  postr: function(url, data, callback) {
	    return request.request("POST", url, data, callback);
	  },
	  put: function(url, data, callback) {
	    return request.request("PUT", url, data, callback);
	  },
	  del: function(url, callback) {
	    return request.request("DELETE", url, null, callback);
	  }
	};


/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	var Folder, Konnector, KonnectorListener,
	  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
	  hasProp = {}.hasOwnProperty;
	
	Konnector = __webpack_require__(3);
	
	Folder = __webpack_require__(4);
	
	module.exports = KonnectorListener = (function(superClass) {
	  extend(KonnectorListener, superClass);
	
	  function KonnectorListener() {
	    return KonnectorListener.__super__.constructor.apply(this, arguments);
	  }
	
	  KonnectorListener.prototype.models = {
	    konnector: Konnector,
	    folder: Folder
	  };
	
	  KonnectorListener.prototype.events = ['konnector.update', 'folder.create', 'folder.update', 'folder.delete'];
	
	  KonnectorListener.prototype.onRemoteUpdate = function(model) {
	    var errorMessage, formattedDate, isImporting, lastImport, lastImportField, ref, slug;
	    if ((model != null ? (ref = model.get('docType')) != null ? ref.toLowerCase() : void 0 : void 0) === 'konnector') {
	      isImporting = model.get('isImporting');
	      slug = model.get('slug');
	      lastImport = model.get('lastImport');
	      errorMessage = model.get('importErrorMessage');
	      formattedDate = moment(lastImport).format(t('date format'));
	      lastImportField = $(".konnector-" + slug + " .last-import");
	      if (isImporting) {
	        lastImportField.html(t('importing...'));
	      } else if (lastImport != null) {
	        lastImportField.html(formattedDate);
	      } else {
	        lastImportField.html(t('no import performed'));
	      }
	      if (errorMessage != null) {
	        return Backbone.Mediator.pub('konnector:error', model);
	      }
	    } else {
	      return Backbone.Mediator.pub('folders:update', new Folder(model.attributes));
	    }
	  };
	
	  KonnectorListener.prototype.onRemoteCreate = function(model) {
	    return Backbone.Mediator.pub('folders:create', model);
	  };
	
	  KonnectorListener.prototype.onRemoteDelete = function(model) {
	    return Backbone.Mediator.pub('folders:delete', model);
	  };
	
	  return KonnectorListener;
	
	})(CozySocketListener);


/***/ },
/* 3 */
/***/ function(module, exports) {

	var KonnectorModel,
	  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
	  hasProp = {}.hasOwnProperty;
	
	module.exports = KonnectorModel = (function(superClass) {
	  extend(KonnectorModel, superClass);
	
	  function KonnectorModel() {
	    return KonnectorModel.__super__.constructor.apply(this, arguments);
	  }
	
	  KonnectorModel.prototype.rootUrl = "konnectors/";
	
	  KonnectorModel.prototype.url = function() {
	    return "konnectors/" + (this.get('id'));
	  };
	
	  KonnectorModel.prototype.isConfigured = function() {
	    var accounts, field, fieldValue, fieldValues, fields, noEmptyValue, numFieldValues, numFields, ref;
	    accounts = this.get('accounts') || [{}];
	    fieldValues = accounts[0] || {};
	    fields = this.get('fields');
	    numFieldValues = Object.keys(fieldValues).length;
	    numFields = Object.keys(fields).length;
	    if (fieldValues.loginUrl) {
	      numFieldValues--;
	    }
	    if (fields.loginUrl) {
	      numFields--;
	    }
	    noEmptyValue = true;
	    for (field in fields) {
	      fieldValue = fields[field];
	      if (field !== 'loginUrl') {
	        noEmptyValue = noEmptyValue && ((ref = fieldValues[field]) != null ? ref.length : void 0) > 0;
	      }
	    }
	    return numFieldValues >= numFields && noEmptyValue;
	  };
	
	  return KonnectorModel;
	
	})(Backbone.Model);


/***/ },
/* 4 */
/***/ function(module, exports) {

	var FolderModel,
	  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
	  hasProp = {}.hasOwnProperty;
	
	module.exports = FolderModel = (function(superClass) {
	  extend(FolderModel, superClass);
	
	  function FolderModel() {
	    return FolderModel.__super__.constructor.apply(this, arguments);
	  }
	
	  FolderModel.prototype.rootUrl = 'folders/';
	
	  FolderModel.prototype.url = function() {
	    return "folders/" + (this.get('id'));
	  };
	
	  FolderModel.prototype.getFullPath = function() {
	    return (this.get('path')) + "/" + (this.get('name'));
	  };
	
	  return FolderModel;
	
	})(Backbone.Model);


/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	var KonnectorCollection,
	  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
	  hasProp = {}.hasOwnProperty;
	
	module.exports = KonnectorCollection = (function(superClass) {
	  extend(KonnectorCollection, superClass);
	
	  function KonnectorCollection() {
	    return KonnectorCollection.__super__.constructor.apply(this, arguments);
	  }
	
	  KonnectorCollection.prototype.model = __webpack_require__(3);
	
	  KonnectorCollection.prototype.url = 'konnectors/';
	
	  KonnectorCollection.prototype.comparator = function(a, b) {
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
	
	  return KonnectorCollection;
	
	})(Backbone.Collection);


/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	var FolderCollection,
	  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
	  hasProp = {}.hasOwnProperty;
	
	module.exports = FolderCollection = (function(superClass) {
	  extend(FolderCollection, superClass);
	
	  function FolderCollection() {
	    return FolderCollection.__super__.constructor.apply(this, arguments);
	  }
	
	  FolderCollection.prototype.model = __webpack_require__(4);
	
	  FolderCollection.prototype.url = 'folders/';
	
	  FolderCollection.prototype.comparator = function(a, b) {
	    return a.getFullPath().localeCompare(b.getFullPath());
	  };
	
	  FolderCollection.prototype.getAllPaths = function() {
	    return this.models.map(function(model) {
	      return {
	        path: model.getFullPath(),
	        id: model.get('id')
	      };
	    });
	  };
	
	  return FolderCollection;
	
	})(Backbone.Collection);


/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	var AppView, BaseView, KonnectorView, MenuView, request,
	  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
	  hasProp = {}.hasOwnProperty;
	
	BaseView = __webpack_require__(8);
	
	KonnectorView = __webpack_require__(9);
	
	MenuView = __webpack_require__(13);
	
	request = __webpack_require__(1);
	
	module.exports = AppView = (function(superClass) {
	  extend(AppView, superClass);
	
	  AppView.prototype.el = 'body';
	
	  AppView.prototype.template = __webpack_require__(17);
	
	  AppView.prototype.defaultTemplate = __webpack_require__(18);
	
	  AppView.prototype.events = {
	    'click #menu-toggler': 'toggleMenu'
	  };
	
	  AppView.prototype.subscriptions = {
	    'folders:create': 'onFolderRemoteCreate',
	    'folders:update': 'onFolderRemoteUpdate',
	    'folders:delete': 'onFolderRemoteDelete'
	  };
	
	  function AppView(options) {
	    AppView.__super__.constructor.call(this, options);
	    this.folders = options.folders;
	  }
	
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
	
	  AppView.prototype.toggleMenu = function() {
	    return this.$('#menu').toggleClass('active');
	  };
	
	  AppView.prototype.hideMenu = function() {
	    return this.$('#menu').removeClass('active');
	  };
	
	  AppView.prototype.showKonnector = function(slug) {
	    var el, konnector, paths;
	    konnector = this.collection.findWhere({
	      slug: slug
	    });
	    if (konnector != null) {
	      this.cleanCurrentView();
	      paths = this.folders.getAllPaths();
	      this.konnectorView = new KonnectorView({
	        model: konnector,
	        paths: paths
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
	
	  AppView.prototype.cleanCurrentView = function() {
	    var defaultView;
	    if (this.konnectorView != null) {
	      this.konnectorView.destroy();
	    }
	    defaultView = this.container.find('#default');
	    if (defaultView.length > 0) {
	      this.$('#menu-toggler').remove();
	      return defaultView.remove();
	    }
	  };
	
	  AppView.prototype.onFolderRemoteCreate = function(model) {
	    this.folders.add(model);
	    this.konnectorView.paths = this.folders.getAllPaths();
	    return this.konnectorView.render();
	  };
	
	  AppView.prototype.onFolderRemoteUpdate = function(model) {
	    if (model != null) {
	      this.folders.add(model, {
	        merge: true
	      });
	      this.konnectorView.paths = this.folders.getAllPaths();
	      return this.konnectorView.render();
	    }
	  };
	
	  AppView.prototype.onFolderRemoteDelete = function(model) {
	    this.folders.remove(model);
	    this.konnectorView.paths = this.folders.getAllPaths();
	    return this.konnectorView.render();
	  };
	
	  return AppView;
	
	})(BaseView);


/***/ },
/* 8 */
/***/ function(module, exports) {

	var BaseView,
	  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
	  hasProp = {}.hasOwnProperty;
	
	module.exports = BaseView = (function(superClass) {
	  extend(BaseView, superClass);
	
	  function BaseView() {
	    return BaseView.__super__.constructor.apply(this, arguments);
	  }
	
	  BaseView.prototype.template = function() {};
	
	  BaseView.prototype.initialize = function() {};
	
	  BaseView.prototype.getRenderData = function() {
	    var ref;
	    return {
	      model: (ref = this.model) != null ? ref.toJSON() : void 0
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


/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

	var BaseView, KonnectorView, request,
	  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
	  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
	  hasProp = {}.hasOwnProperty;
	
	BaseView = __webpack_require__(8);
	
	request = __webpack_require__(1);
	
	module.exports = KonnectorView = (function(superClass) {
	  extend(KonnectorView, superClass);
	
	  function KonnectorView() {
	    this.renderValues = bind(this.renderValues, this);
	    this.afterRender = bind(this.afterRender, this);
	    return KonnectorView.__super__.constructor.apply(this, arguments);
	  }
	
	  KonnectorView.prototype.template = __webpack_require__(10);
	
	  KonnectorView.prototype.className = 'konnector';
	
	  KonnectorView.prototype.events = {
	    "click #import-button": "onImportClicked",
	    "click #add-button": "onAddClicked",
	    "click #remove-button": "onRemoveClicked",
	    "click #delete-button": "onDeleteClicked"
	  };
	
	  KonnectorView.prototype.subscriptions = {
	    "konnector:error": "onImportError"
	  };
	
	  KonnectorView.prototype.initialize = function(options) {
	    KonnectorView.__super__.initialize.call(this, options);
	    this.paths = options.paths || [
	      {
	        path: '/',
	        id: ''
	      }
	    ];
	    return this.listenTo(this.model, 'change', this.render);
	  };
	
	  KonnectorView.prototype.afterRender = function() {
	    var end, errorMessage, i, ref, slug, values;
	    slug = this.model.get('slug');
	    if (this.values == null) {
	      this.values = this.model.get('accounts') || [{}];
	    }
	    errorMessage = this.model.get('importErrorMessage');
	    this.$el.addClass("konnector-" + slug);
	    this.updateImportWidget();
	    if ((errorMessage == null) || this.model.get('isImporting')) {
	      this.hideErrors();
	    } else if (errorMessage) {
	      this.showErrors(t(errorMessage));
	    }
	    if (this.values.length === 0) {
	      this.values.push({});
	    }
	    end = this.values.length - 1;
	    ref = this.values;
	    for (i in ref) {
	      values = ref[i];
	      this.renderValues(values, slug, i);
	      if (i !== end) {
	        this.$('.fields').append('<hr/>');
	      }
	    }
	    return this.addIntervalWidget(slug);
	  };
	
	  KonnectorView.prototype.renderValues = function(values, slug, index) {
	    var name, ref, results, val;
	    ref = this.model.get('fields');
	    results = [];
	    for (name in ref) {
	      val = ref[name];
	      if (values[name] == null) {
	        values[name] = "";
	      }
	      this.addFieldWidget(slug, name, val, values, index);
	      if (val === 'folder') {
	        results.push(this.configureFolderInput(slug, name, index));
	      } else {
	        results.push(void 0);
	      }
	    }
	    return results;
	  };
	
	  KonnectorView.prototype.updateImportWidget = function() {
	    var formattedDate, isImporting, lastImport;
	    isImporting = this.model.get('isImporting');
	    lastImport = this.model.get('lastImport');
	    this.$('.last-import').html(t('importing...'));
	    if (isImporting) {
	      return this.disableImportButton();
	    } else if (lastImport != null) {
	      formattedDate = moment(lastImport).format(t('date format'));
	      this.$('.last-import').html(formattedDate);
	      return this.enableImportButton();
	    } else {
	      this.$('.last-import').html(t("no import performed"));
	      return this.enableImportButton();
	    }
	  };
	
	  KonnectorView.prototype.enableImportButton = function() {
	    this.$('#import-button').attr('aria-busy', false);
	    return this.$('#import-button').attr('aria-disabled', false);
	  };
	
	  KonnectorView.prototype.disableImportButton = function() {
	    this.$('#import-button').attr('aria-busy', true);
	    return this.$('#import-button').attr('aria-disabled', true);
	  };
	
	  KonnectorView.prototype.showErrors = function(msg) {
	    msg = msg.replace(/<[^>]*>/ig, '');
	    this.$('.error .message').html(msg);
	    return this.$('.error').show();
	  };
	
	  KonnectorView.prototype.hideErrors = function() {
	    return this.$('.error').hide();
	  };
	
	  KonnectorView.prototype.onAddClicked = function() {
	    var i, j, ref, values;
	    values = [];
	    for (i = j = 0, ref = this.values.length - 1; 0 <= ref ? j <= ref : j >= ref; i = 0 <= ref ? ++j : --j) {
	      values.push(this.getFieldValues(i));
	    }
	    values.push({});
	    this.values = values;
	    this.render();
	    if (this.values.length > 4) {
	      return this.$('#add-button').hide();
	    }
	  };
	
	  KonnectorView.prototype.onRemoveClicked = function() {
	    var i, j, ref, values;
	    values = [];
	    for (i = j = 0, ref = this.values.length - 1; 0 <= ref ? j <= ref : j >= ref; i = 0 <= ref ? ++j : --j) {
	      values.push(this.getFieldValues(i));
	    }
	    values.pop();
	    this.values = values;
	    this.render();
	    if (this.values.length > 4) {
	      return this.$('#add-button').hide();
	    }
	  };
	
	  KonnectorView.prototype.getFieldValues = function(index) {
	    var fieldValues, name, ref, slug, val;
	    slug = this.model.get('slug');
	    fieldValues = {};
	    ref = this.model.get('fields');
	    for (name in ref) {
	      val = ref[name];
	      if (val === 'folder') {
	        fieldValues[name] = this.getFolderPath(slug, name, index);
	      } else {
	        fieldValues[name] = $("#" + slug + "-" + name + index + "-input").val();
	      }
	    }
	    return fieldValues;
	  };
	
	  KonnectorView.prototype.onImportClicked = function() {
	    var accounts, data, date, i, importInterval, ref, slug, values;
	    if (!this.model.get('isImporting')) {
	      slug = this.model.get('slug');
	      date = $("#" + slug + "-import-date").val();
	      this.hideErrors();
	      accounts = [];
	      ref = this.values;
	      for (i in ref) {
	        values = ref[i];
	        accounts.push(this.getFieldValues(i));
	      }
	      this.values = accounts;
	      importInterval = $("#" + slug + "-autoimport-input").val();
	      this.disableImportButton();
	      data = {
	        accounts: accounts,
	        importInterval: importInterval,
	        date: date
	      };
	      this.model.set({
	        'isImporting': true
	      });
	      return this.model.save(data, {
	        success: function(model, success) {},
	        error: (function(_this) {
	          return function(model, err) {
	            var error, error1;
	            if (err.status >= 400 && err.status !== 504) {
	              try {
	                return _this.showErrors(t(JSON.parse(err.responseText).message));
	              } catch (error1) {
	                error = error1;
	                return _this.showErrors(t("import server error"));
	              }
	            }
	          };
	        })(this)
	      });
	    } else {
	      return alert(t('import already running'));
	    }
	  };
	
	  KonnectorView.prototype.getFolderPath = function(slug, name, index) {
	    var id, path, value;
	    id = $("#" + slug + "-" + name + index + "-input").val();
	    value = '';
	    path = _.findWhere(this.paths, {
	      id: id
	    });
	    if (path != null) {
	      value = path.path;
	    }
	    return value;
	  };
	
	  KonnectorView.prototype.configureFolderInput = function(slug, name, index) {
	    var input;
	    input = this.$("#" + slug + "-" + name + index + "-input");
	    return input.change(function() {
	      var folderButton, id, link;
	      id = input.val();
	      folderButton = input.parent().parent().find(".folder-link");
	      link = "/#apps/files/folders/" + id;
	      return folderButton.attr('href', link);
	    });
	  };
	
	  KonnectorView.prototype.addFieldWidget = function(slug, name, val, values, index) {
	    var fieldHtml, j, len, path, pathName, ref, selectedPath;
	    if (val === 'label') {
	      fieldHtml = "<div class=\"field line " + (val === 'hidden' ? 'hidden' : void 0) + "\">\n    <label for=\"" + slug + "-" + name + index + "-input\">" + (t(name)) + " : </label>\n    <b id=\"" + slug + "-" + name + index + "-input\" >" + values[name] + "</b>\n</div>";
	    } else if (val === 'link') {
	      fieldHtml = "<div class=\"field line " + (val === 'hidden' ? 'hidden' : void 0) + "\">\n    <label for=\"" + slug + "-" + name + index + "-input\">" + (t(name)) + " : </label>\n    <a target=\"_blank\" href=\"" + values[name] + "\"\n       id=\"" + slug + "-" + name + index + "-input\">\n        " + values[name] + "\n    </a>\n</div>";
	    } else {
	      fieldHtml = "<div class=\"field line " + (val === 'hidden' ? 'hidden' : void 0) + "\">\n<div><label for=\"" + slug + "-" + name + index + "-input\">" + (t(name)) + "</label></div>";
	      if (val === 'folder') {
	        fieldHtml += "<div><select id=\"" + slug + "-" + name + index + "-input\" class=\"folder\"\">";
	        selectedPath = {
	          path: '',
	          id: ''
	        };
	        pathName = values[name];
	        if (this.paths.length > 0) {
	          if (pathName == null) {
	            pathName = this.paths[0].path;
	          }
	        }
	        if (this.paths.length > 0) {
	          ref = this.paths;
	          for (j = 0, len = ref.length; j < len; j++) {
	            path = ref[j];
	            if (path.path === pathName) {
	              fieldHtml += "<option selected value=\"" + path.id + "\">" + path.path + "</option>";
	              selectedPath = path;
	            } else {
	              fieldHtml += "<option value=\"" + path.id + "\">" + path.path + "</option>";
	            }
	          }
	        }
	        fieldHtml += "</select></div>";
	        fieldHtml += "<a href=\"/#apps/files/folders/" + selectedPath.id + "\"\nclass=\"folder-link\"\ntarget=\"_blank\">\n" + (t("open selected folder")) + "\n</a>";
	        fieldHtml += "</div>";
	      } else {
	        fieldHtml += "<div><input id=\"" + slug + "-" + name + index + "-input\" type=\"" + val + "\"\n\n        value=\"" + values[name] + "\" " + (val === 'readonly' ? 'readonly' : void 0) + " /></div>\n</div>";
	      }
	    }
	    return this.$('.fields').append(fieldHtml);
	  };
	
	  KonnectorView.prototype.addIntervalWidget = function(slug) {
	    var customViewElem, fieldHtml, importInterval, intervals, isLater, key, lastAutoImport, rawCustomView, selected, translatedCustomView, val, value;
	    lastAutoImport = this.model.get('lastAutoImport');
	    intervals = {
	      none: t("none"),
	      hour: t("every hour"),
	      day: t("every day"),
	      week: t("every week"),
	      month: t("each month")
	    };
	    importInterval = this.model.get('importInterval' || '');
	    fieldHtml = "<div class=\"field line\">\n<div><label for=\"" + slug + "-autoimport-input\">" + (t('auto import')) + "</label></div>\n<div><select id=\"" + slug + "-autoimport-input\" class=\"autoimport\">";
	    for (key in intervals) {
	      value = intervals[key];
	      selected = importInterval === key ? 'selected' : '';
	      fieldHtml += "<option value=\"" + key + "\" " + selected + ">" + value + "</option>";
	    }
	    fieldHtml += "</select>\n<span id=\"" + slug + "-first-import\">\n<span id=\"" + slug + "-first-import-text\">\n<a id=\"" + slug + "-first-import-link\" href=\"#\">" + (t("select starting date")) + "</a>\n</span>\n<span id=\"" + slug + "-first-import-date\"><span>" + (t("start import from")) + "</span>\n<input id=\"" + slug + "-import-date\" class=\"autoimport\" maxlength=\"8\" type=\"text\">\n</input>\n</span></span>\n</div>\n</div>";
	    this.$('.fields').append(fieldHtml);
	    this.autoImportInput = this.$("#" + slug + "-autoimport-input");
	    this.firstImport = this.$("#" + slug + "-first-import");
	    this.firstImportDate = this.$("#" + slug + "-first-import-date");
	    this.importDate = this.$("#" + slug + "-import-date");
	    this.firstImportText = this.$("#" + slug + "-first-import-text");
	    this.firstImportLink = this.$("#" + slug + "-first-import-link");
	    importInterval = this.autoImportInput.val();
	    this.firstImportDate.hide();
	    this.importDate.datepicker({
	      minDate: 1,
	      dateFormat: "dd-mm-yy"
	    });
	    if (!(importInterval === 'none' || importInterval === 'hour')) {
	      isLater = moment(lastAutoImport).valueOf() > moment().valueOf();
	      if ((lastAutoImport != null) && isLater) {
	        val = moment(lastAutoImport).format('DD-MM-YYYY');
	        this.firstImportDate.show();
	        this.firstImportText.hide();
	        this.importDate.val(val);
	      } else {
	        this.firstImport.show();
	      }
	    } else {
	      this.firstImport.hide();
	    }
	    this.firstImportLink.click((function(_this) {
	      return function(event) {
	        event.preventDefault();
	        _this.firstImportDate.show();
	        return _this.firstImportText.hide();
	      };
	    })(this));
	    this.autoImportInput.change((function(_this) {
	      return function() {
	        importInterval = _this.autoImportInput.val();
	        if (!(importInterval === 'none' || importInterval === 'hour')) {
	          return _this.firstImport.show();
	        } else {
	          return _this.firstImport.hide();
	        }
	      };
	    })(this));
	    if (this.model.has('customView')) {
	      rawCustomView = this.model.get('customView');
	      translatedCustomView = rawCustomView.replace(/<%t ([^%]*)%>/g, function(match, key) {
	        return t(key.trim());
	      });
	      customViewElem = $("<div class='customView'></div");
	      customViewElem.append(translatedCustomView);
	      return customViewElem.insertBefore(this.$('.fields'));
	    }
	  };
	
	  KonnectorView.prototype.onDeleteClicked = function() {
	    return request.del("konnectors/" + this.model.id, (function(_this) {
	      return function(err) {
	        if (err) {
	          return alert(t('konnector deletion error'));
	        } else {
	          alert(t('konnector deleted'));
	          _this.model.set('lastAutoImport', null);
	          _this.model.set('accounts', [{}]);
	          _this.model.set('password', '{}');
	          return window.router.navigate('', {
	            trigger: true
	          });
	        }
	      };
	    })(this));
	  };
	
	  KonnectorView.prototype.onImportError = function(model) {
	    var errorMessage;
	    errorMessage = model.get('importErrorMessage');
	    this.model.set('importErrorMessage', errorMessage);
	    return this.showErrors(errorMessage);
	  };
	
	  return KonnectorView;
	
	})(BaseView);


/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

	var jade = __webpack_require__(11);
	
	module.exports = function template(locals) {
	var jade_debug = [ new jade.DebugItem( 1, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/konnector.jade" ) ];
	try {
	var buf = [];
	var jade_mixins = {};
	var jade_interp;
	;var locals_for_with = (locals || {});(function (model, status, t, undefined) {
	jade_debug.unshift(new jade.DebugItem( 0, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/konnector.jade" ));
	jade_debug.unshift(new jade.DebugItem( 1, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/konnector.jade" ));
	buf.push("<!-- .konnector -->");
	jade_debug.shift();
	jade_debug.unshift(new jade.DebugItem( 3, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/konnector.jade" ));
	buf.push("<h2 class=\"name\">");
	jade_debug.unshift(new jade.DebugItem( undefined, jade_debug[0].filename ));
	jade_debug.unshift(new jade.DebugItem( 4, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/konnector.jade" ));
	buf.push("<div id=\"menu-toggler\">");
	jade_debug.unshift(new jade.DebugItem( undefined, jade_debug[0].filename ));
	jade_debug.unshift(new jade.DebugItem( 5, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/konnector.jade" ));
	buf.push("<div class=\"fa fa-bars\">");
	jade_debug.unshift(new jade.DebugItem( undefined, jade_debug[0].filename ));
	jade_debug.shift();
	buf.push("</div>");
	jade_debug.shift();
	jade_debug.shift();
	buf.push("</div>");
	jade_debug.shift();
	jade_debug.unshift(new jade.DebugItem( 6, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/konnector.jade" ));
	buf.push("<span class=\"service-icon\">");
	jade_debug.unshift(new jade.DebugItem( undefined, jade_debug[0].filename ));
	jade_debug.shift();
	buf.push("</span>");
	jade_debug.shift();
	jade_debug.unshift(new jade.DebugItem( 7, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/konnector.jade" ));
	buf.push("<span>");
	jade_debug.unshift(new jade.DebugItem( undefined, jade_debug[0].filename ));
	jade_debug.unshift(new jade.DebugItem( 7, jade_debug[0].filename ));
	buf.push("" + (jade.escape((jade_interp = model.name) == null ? '' : jade_interp)) + "");
	jade_debug.shift();
	jade_debug.shift();
	buf.push("</span>");
	jade_debug.shift();
	jade_debug.shift();
	buf.push("</h2>");
	jade_debug.shift();
	jade_debug.unshift(new jade.DebugItem( 9, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/konnector.jade" ));
	buf.push("<div class=\"description\">" + (null == (jade_interp = t(model.description)) ? "" : jade_interp));
	jade_debug.unshift(new jade.DebugItem( undefined, jade_debug[0].filename ));
	jade_debug.shift();
	buf.push("</div>");
	jade_debug.shift();
	jade_debug.unshift(new jade.DebugItem( 10, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/konnector.jade" ));
	buf.push("<div class=\"fields\">");
	jade_debug.unshift(new jade.DebugItem( undefined, jade_debug[0].filename ));
	jade_debug.shift();
	buf.push("</div>");
	jade_debug.shift();
	jade_debug.unshift(new jade.DebugItem( 11, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/konnector.jade" ));
	buf.push("<div>");
	jade_debug.unshift(new jade.DebugItem( undefined, jade_debug[0].filename ));
	jade_debug.unshift(new jade.DebugItem( 12, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/konnector.jade" ));
	buf.push("<button id=\"add-button\" class=\"small\">");
	jade_debug.unshift(new jade.DebugItem( undefined, jade_debug[0].filename ));
	jade_debug.unshift(new jade.DebugItem( 12, jade_debug[0].filename ));
	buf.push("" + (jade.escape((jade_interp = t('add an account')) == null ? '' : jade_interp)) + "");
	jade_debug.shift();
	jade_debug.shift();
	buf.push("</button>");
	jade_debug.shift();
	jade_debug.unshift(new jade.DebugItem( 13, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/konnector.jade" ));
	buf.push("<button id=\"remove-button\" class=\"small\">");
	jade_debug.unshift(new jade.DebugItem( undefined, jade_debug[0].filename ));
	jade_debug.unshift(new jade.DebugItem( 13, jade_debug[0].filename ));
	buf.push("" + (jade.escape((jade_interp = t('remove last account')) == null ? '' : jade_interp)) + "");
	jade_debug.shift();
	jade_debug.shift();
	buf.push("</button>");
	jade_debug.shift();
	jade_debug.shift();
	buf.push("</div>");
	jade_debug.shift();
	jade_debug.unshift(new jade.DebugItem( 14, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/konnector.jade" ));
	buf.push("<div class=\"buttons\">");
	jade_debug.unshift(new jade.DebugItem( undefined, jade_debug[0].filename ));
	jade_debug.unshift(new jade.DebugItem( 15, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/konnector.jade" ));
	buf.push("<button id=\"import-button\">");
	jade_debug.unshift(new jade.DebugItem( undefined, jade_debug[0].filename ));
	jade_debug.unshift(new jade.DebugItem( 15, jade_debug[0].filename ));
	buf.push("" + (jade.escape((jade_interp = t('save and import')) == null ? '' : jade_interp)) + "");
	jade_debug.shift();
	jade_debug.shift();
	buf.push("</button>");
	jade_debug.shift();
	jade_debug.shift();
	buf.push("</div>");
	jade_debug.shift();
	jade_debug.unshift(new jade.DebugItem( 17, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/konnector.jade" ));
	if ( model.importErrorMessage && !model.isImporting)
	{
	jade_debug.unshift(new jade.DebugItem( 18, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/konnector.jade" ));
	jade_debug.unshift(new jade.DebugItem( 18, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/konnector.jade" ));
	buf.push("<div class=\"error\">");
	jade_debug.unshift(new jade.DebugItem( undefined, jade_debug[0].filename ));
	jade_debug.unshift(new jade.DebugItem( 19, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/konnector.jade" ));
	buf.push("<span class=\"error\">" + (jade.escape(null == (jade_interp = t('error occurred during import:') + ' ') ? "" : jade_interp)));
	jade_debug.unshift(new jade.DebugItem( 20, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/konnector.jade" ));
	jade_debug.unshift(new jade.DebugItem( 20, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/konnector.jade" ));
	buf.push("<span class=\"message\">" + (jade.escape(null == (jade_interp = t(model.importErrorMessage)) ? "" : jade_interp)));
	jade_debug.unshift(new jade.DebugItem( undefined, jade_debug[0].filename ));
	jade_debug.shift();
	buf.push("</span>");
	jade_debug.shift();
	jade_debug.shift();
	jade_debug.unshift(new jade.DebugItem( undefined, jade_debug[0].filename ));
	jade_debug.shift();
	buf.push("</span>");
	jade_debug.shift();
	jade_debug.shift();
	buf.push("</div>");
	jade_debug.shift();
	jade_debug.shift();
	}
	jade_debug.shift();
	jade_debug.unshift(new jade.DebugItem( 22, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/konnector.jade" ));
	buf.push("<div class=\"status\">");
	jade_debug.unshift(new jade.DebugItem( undefined, jade_debug[0].filename ));
	jade_debug.unshift(new jade.DebugItem( 22, jade_debug[0].filename ));
	buf.push("" + (jade.escape((jade_interp = status) == null ? '' : jade_interp)) + "");
	jade_debug.shift();
	jade_debug.shift();
	buf.push("</div>");
	jade_debug.shift();
	jade_debug.unshift(new jade.DebugItem( 23, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/konnector.jade" ));
	buf.push("<div class=\"infos\">");
	jade_debug.unshift(new jade.DebugItem( undefined, jade_debug[0].filename ));
	jade_debug.unshift(new jade.DebugItem( 24, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/konnector.jade" ));
	buf.push("<div class=\"date\">");
	jade_debug.unshift(new jade.DebugItem( undefined, jade_debug[0].filename ));
	jade_debug.unshift(new jade.DebugItem( 25, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/konnector.jade" ));
	buf.push("<span class=\"label\">");
	jade_debug.unshift(new jade.DebugItem( undefined, jade_debug[0].filename ));
	jade_debug.unshift(new jade.DebugItem( 25, jade_debug[0].filename ));
	buf.push("" + (jade.escape((jade_interp = t('last import:')) == null ? '' : jade_interp)) + "&nbsp;");
	jade_debug.shift();
	jade_debug.shift();
	buf.push("</span>");
	jade_debug.shift();
	jade_debug.unshift(new jade.DebugItem( 26, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/konnector.jade" ));
	buf.push("<span class=\"last-import\">");
	jade_debug.unshift(new jade.DebugItem( undefined, jade_debug[0].filename ));
	jade_debug.shift();
	buf.push("</span>");
	jade_debug.shift();
	jade_debug.shift();
	buf.push("</div>");
	jade_debug.shift();
	jade_debug.unshift(new jade.DebugItem( 27, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/konnector.jade" ));
	buf.push("<div class=\"datas\">");
	jade_debug.unshift(new jade.DebugItem( undefined, jade_debug[0].filename ));
	jade_debug.unshift(new jade.DebugItem( 28, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/konnector.jade" ));
	buf.push("" + (jade.escape((jade_interp = t('imported data:')) == null ? '' : jade_interp)) + "&nbsp;");
	jade_debug.shift();
	jade_debug.unshift(new jade.DebugItem( 29, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/konnector.jade" ));
	// iterate model.modelNames
	;(function(){
	  var $$obj = model.modelNames;
	  if ('number' == typeof $$obj.length) {
	
	    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
	      var name = $$obj[$index];
	
	jade_debug.unshift(new jade.DebugItem( 29, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/konnector.jade" ));
	jade_debug.unshift(new jade.DebugItem( 30, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/konnector.jade" ));
	buf.push("<a" + (jade.attr("href", "/apps/databrowser/#search/all/" + (name) + "", true, true)) + " target=\"_blank\">");
	jade_debug.unshift(new jade.DebugItem( undefined, jade_debug[0].filename ));
	jade_debug.unshift(new jade.DebugItem( 31, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/konnector.jade" ));
	buf.push("" + (jade.escape((jade_interp = name) == null ? '' : jade_interp)) + "&nbsp;");
	jade_debug.shift();
	jade_debug.shift();
	buf.push("</a>");
	jade_debug.shift();
	jade_debug.shift();
	    }
	
	  } else {
	    var $$l = 0;
	    for (var $index in $$obj) {
	      $$l++;      var name = $$obj[$index];
	
	jade_debug.unshift(new jade.DebugItem( 29, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/konnector.jade" ));
	jade_debug.unshift(new jade.DebugItem( 30, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/konnector.jade" ));
	buf.push("<a" + (jade.attr("href", "/apps/databrowser/#search/all/" + (name) + "", true, true)) + " target=\"_blank\">");
	jade_debug.unshift(new jade.DebugItem( undefined, jade_debug[0].filename ));
	jade_debug.unshift(new jade.DebugItem( 31, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/konnector.jade" ));
	buf.push("" + (jade.escape((jade_interp = name) == null ? '' : jade_interp)) + "&nbsp;");
	jade_debug.shift();
	jade_debug.shift();
	buf.push("</a>");
	jade_debug.shift();
	jade_debug.shift();
	    }
	
	  }
	}).call(this);
	
	jade_debug.shift();
	jade_debug.shift();
	buf.push("</div>");
	jade_debug.shift();
	jade_debug.shift();
	buf.push("</div>");
	jade_debug.shift();
	jade_debug.unshift(new jade.DebugItem( 33, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/konnector.jade" ));
	buf.push("<div class=\"danger-zone\">");
	jade_debug.unshift(new jade.DebugItem( undefined, jade_debug[0].filename ));
	jade_debug.unshift(new jade.DebugItem( 34, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/konnector.jade" ));
	buf.push("<h3>" + (jade.escape(null == (jade_interp = t('konnector danger zone')) ? "" : jade_interp)));
	jade_debug.unshift(new jade.DebugItem( undefined, jade_debug[0].filename ));
	jade_debug.shift();
	buf.push("</h3>");
	jade_debug.shift();
	jade_debug.unshift(new jade.DebugItem( 35, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/konnector.jade" ));
	buf.push("<button id=\"delete-button\">" + (jade.escape(null == (jade_interp = t('konnector delete credentials')) ? "" : jade_interp)));
	jade_debug.unshift(new jade.DebugItem( undefined, jade_debug[0].filename ));
	jade_debug.shift();
	buf.push("</button>");
	jade_debug.shift();
	jade_debug.shift();
	buf.push("</div>");
	jade_debug.shift();
	jade_debug.shift();}.call(this,"model" in locals_for_with?locals_for_with.model:typeof model!=="undefined"?model:undefined,"status" in locals_for_with?locals_for_with.status:typeof status!=="undefined"?status:undefined,"t" in locals_for_with?locals_for_with.t:typeof t!=="undefined"?t:undefined,"undefined" in locals_for_with?locals_for_with.undefined: false?undefined:undefined));;return buf.join("");
	} catch (err) {
	  jade.rethrow(err, jade_debug[0].filename, jade_debug[0].lineno, "<!-- .konnector -->\n\nh2.name\n    #menu-toggler\n        .fa.fa-bars\n    span.service-icon\n    span #{model.name}\n\n.description!= t(model.description)\n.fields\ndiv\n    button.small#add-button #{t('add an account')}\n    button.small#remove-button #{t('remove last account')}\n.buttons\n    button#import-button #{t('save and import')}\n\nif model.importErrorMessage && !model.isImporting\n    .error\n        span.error=t('error occurred during import:') + ' '\n            span.message=t(model.importErrorMessage)\n\n.status #{status}\n.infos\n    .date\n        span.label #{t('last import:')}&nbsp;\n        span.last-import\n    .datas\n        | #{t('imported data:')}&nbsp;\n        for name in model.modelNames\n            a(href=\"/apps/databrowser/#search/all/#{name}\", target=\"_blank\")\n                  |#{name}&nbsp;\n\n.danger-zone\n    h3= t('konnector danger zone')\n    button#delete-button= t('konnector delete credentials')\n\n");
	}
	}

/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	/**
	 * Merge two attribute objects giving precedence
	 * to values in object `b`. Classes are special-cased
	 * allowing for arrays and merging/joining appropriately
	 * resulting in a string.
	 *
	 * @param {Object} a
	 * @param {Object} b
	 * @return {Object} a
	 * @api private
	 */
	
	exports.merge = function merge(a, b) {
	  if (arguments.length === 1) {
	    var attrs = a[0];
	    for (var i = 1; i < a.length; i++) {
	      attrs = merge(attrs, a[i]);
	    }
	    return attrs;
	  }
	  var ac = a['class'];
	  var bc = b['class'];
	
	  if (ac || bc) {
	    ac = ac || [];
	    bc = bc || [];
	    if (!Array.isArray(ac)) ac = [ac];
	    if (!Array.isArray(bc)) bc = [bc];
	    a['class'] = ac.concat(bc).filter(nulls);
	  }
	
	  for (var key in b) {
	    if (key != 'class') {
	      a[key] = b[key];
	    }
	  }
	
	  return a;
	};
	
	/**
	 * Filter null `val`s.
	 *
	 * @param {*} val
	 * @return {Boolean}
	 * @api private
	 */
	
	function nulls(val) {
	  return val != null && val !== '';
	}
	
	/**
	 * join array as classes.
	 *
	 * @param {*} val
	 * @return {String}
	 */
	exports.joinClasses = joinClasses;
	function joinClasses(val) {
	  return (Array.isArray(val) ? val.map(joinClasses) :
	    (val && typeof val === 'object') ? Object.keys(val).filter(function (key) { return val[key]; }) :
	    [val]).filter(nulls).join(' ');
	}
	
	/**
	 * Render the given classes.
	 *
	 * @param {Array} classes
	 * @param {Array.<Boolean>} escaped
	 * @return {String}
	 */
	exports.cls = function cls(classes, escaped) {
	  var buf = [];
	  for (var i = 0; i < classes.length; i++) {
	    if (escaped && escaped[i]) {
	      buf.push(exports.escape(joinClasses([classes[i]])));
	    } else {
	      buf.push(joinClasses(classes[i]));
	    }
	  }
	  var text = joinClasses(buf);
	  if (text.length) {
	    return ' class="' + text + '"';
	  } else {
	    return '';
	  }
	};
	
	
	exports.style = function (val) {
	  if (val && typeof val === 'object') {
	    return Object.keys(val).map(function (style) {
	      return style + ':' + val[style];
	    }).join(';');
	  } else {
	    return val;
	  }
	};
	/**
	 * Render the given attribute.
	 *
	 * @param {String} key
	 * @param {String} val
	 * @param {Boolean} escaped
	 * @param {Boolean} terse
	 * @return {String}
	 */
	exports.attr = function attr(key, val, escaped, terse) {
	  if (key === 'style') {
	    val = exports.style(val);
	  }
	  if ('boolean' == typeof val || null == val) {
	    if (val) {
	      return ' ' + (terse ? key : key + '="' + key + '"');
	    } else {
	      return '';
	    }
	  } else if (0 == key.indexOf('data') && 'string' != typeof val) {
	    if (JSON.stringify(val).indexOf('&') !== -1) {
	      console.warn('Since Jade 2.0.0, ampersands (`&`) in data attributes ' +
	                   'will be escaped to `&amp;`');
	    };
	    if (val && typeof val.toISOString === 'function') {
	      console.warn('Jade will eliminate the double quotes around dates in ' +
	                   'ISO form after 2.0.0');
	    }
	    return ' ' + key + "='" + JSON.stringify(val).replace(/'/g, '&apos;') + "'";
	  } else if (escaped) {
	    if (val && typeof val.toISOString === 'function') {
	      console.warn('Jade will stringify dates in ISO form after 2.0.0');
	    }
	    return ' ' + key + '="' + exports.escape(val) + '"';
	  } else {
	    if (val && typeof val.toISOString === 'function') {
	      console.warn('Jade will stringify dates in ISO form after 2.0.0');
	    }
	    return ' ' + key + '="' + val + '"';
	  }
	};
	
	/**
	 * Render the given attributes object.
	 *
	 * @param {Object} obj
	 * @param {Object} escaped
	 * @return {String}
	 */
	exports.attrs = function attrs(obj, terse){
	  var buf = [];
	
	  var keys = Object.keys(obj);
	
	  if (keys.length) {
	    for (var i = 0; i < keys.length; ++i) {
	      var key = keys[i]
	        , val = obj[key];
	
	      if ('class' == key) {
	        if (val = joinClasses(val)) {
	          buf.push(' ' + key + '="' + val + '"');
	        }
	      } else {
	        buf.push(exports.attr(key, val, false, terse));
	      }
	    }
	  }
	
	  return buf.join('');
	};
	
	/**
	 * Escape the given string of `html`.
	 *
	 * @param {String} html
	 * @return {String}
	 * @api private
	 */
	
	var jade_encode_html_rules = {
	  '&': '&amp;',
	  '<': '&lt;',
	  '>': '&gt;',
	  '"': '&quot;'
	};
	var jade_match_html = /[&<>"]/g;
	
	function jade_encode_char(c) {
	  return jade_encode_html_rules[c] || c;
	}
	
	exports.escape = jade_escape;
	function jade_escape(html){
	  var result = String(html).replace(jade_match_html, jade_encode_char);
	  if (result === '' + html) return html;
	  else return result;
	};
	
	/**
	 * Re-throw the given `err` in context to the
	 * the jade in `filename` at the given `lineno`.
	 *
	 * @param {Error} err
	 * @param {String} filename
	 * @param {String} lineno
	 * @api private
	 */
	
	exports.rethrow = function rethrow(err, filename, lineno, str){
	  if (!(err instanceof Error)) throw err;
	  if ((typeof window != 'undefined' || !filename) && !str) {
	    err.message += ' on line ' + lineno;
	    throw err;
	  }
	  try {
	    str = str || __webpack_require__(12).readFileSync(filename, 'utf8')
	  } catch (ex) {
	    rethrow(err, null, lineno)
	  }
	  var context = 3
	    , lines = str.split('\n')
	    , start = Math.max(lineno - context, 0)
	    , end = Math.min(lines.length, lineno + context);
	
	  // Error context
	  var context = lines.slice(start, end).map(function(line, i){
	    var curr = i + start + 1;
	    return (curr == lineno ? '  > ' : '    ')
	      + curr
	      + '| '
	      + line;
	  }).join('\n');
	
	  // Alter exception message
	  err.path = filename;
	  err.message = (filename || 'Jade') + ':' + lineno
	    + '\n' + context + '\n\n' + err.message;
	  throw err;
	};
	
	exports.DebugItem = function DebugItem(lineno, filename) {
	  this.lineno = lineno;
	  this.filename = filename;
	}


/***/ },
/* 12 */
/***/ function(module, exports) {

	/* (ignored) */

/***/ },
/* 13 */
/***/ function(module, exports, __webpack_require__) {

	var KonnectorsView, MenuItemView, ViewCollection,
	  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
	  hasProp = {}.hasOwnProperty;
	
	ViewCollection = __webpack_require__(14);
	
	MenuItemView = __webpack_require__(15);
	
	module.exports = KonnectorsView = (function(superClass) {
	  extend(KonnectorsView, superClass);
	
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
	    var index, ref, results, view;
	    ref = this.views;
	    results = [];
	    for (index in ref) {
	      view = ref[index];
	      results.push(view.unselect());
	    }
	    return results;
	  };
	
	  return KonnectorsView;
	
	})(ViewCollection);


/***/ },
/* 14 */
/***/ function(module, exports, __webpack_require__) {

	var BaseView, ViewCollection,
	  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
	  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
	  hasProp = {}.hasOwnProperty;
	
	BaseView = __webpack_require__(8);
	
	module.exports = ViewCollection = (function(superClass) {
	  extend(ViewCollection, superClass);
	
	  function ViewCollection() {
	    this.fetch = bind(this.fetch, this);
	    this.removeItem = bind(this.removeItem, this);
	    this.addItem = bind(this.addItem, this);
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
	    var id, ref, view;
	    ref = this.views;
	    for (id in ref) {
	      view = ref[id];
	      view.$el.detach();
	    }
	    return ViewCollection.__super__.render.apply(this, arguments);
	  };
	
	  ViewCollection.prototype.afterRender = function() {
	    var id, ref, view;
	    ref = this.views;
	    for (id in ref) {
	      view = ref[id];
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
	    var id, ref, view;
	    ref = this.views;
	    for (id in ref) {
	      view = ref[id];
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


/***/ },
/* 15 */
/***/ function(module, exports, __webpack_require__) {

	var BaseView, MenuItemView,
	  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
	  hasProp = {}.hasOwnProperty;
	
	BaseView = __webpack_require__(8);
	
	module.exports = MenuItemView = (function(superClass) {
	  extend(MenuItemView, superClass);
	
	  function MenuItemView() {
	    return MenuItemView.__super__.constructor.apply(this, arguments);
	  }
	
	  MenuItemView.prototype.tagName = 'li';
	
	  MenuItemView.prototype.template = __webpack_require__(16);
	
	  MenuItemView.prototype.initialize = function(options) {
	    MenuItemView.__super__.initialize.call(this, options);
	    return this.listenTo(this.model, 'change', this.render);
	  };
	
	  MenuItemView.prototype.getRenderData = function() {
	    var formattedDate, lastImport;
	    lastImport = this.model.get('lastImport');
	    if (this.model.isConfigured() && (lastImport != null)) {
	      formattedDate = moment(lastImport).format(t('date format'));
	      lastImport = (t('last import:')) + "  " + formattedDate;
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
	      this.$el.addClass('configured');
	    }
	    return this.$el.addClass(this.model.get('slug'));
	  };
	
	  MenuItemView.prototype.select = function() {
	    return this.$el.addClass('selected');
	  };
	
	  MenuItemView.prototype.unselect = function() {
	    return this.$el.removeClass('selected');
	  };
	
	  return MenuItemView;
	
	})(BaseView);


/***/ },
/* 16 */
/***/ function(module, exports, __webpack_require__) {

	var jade = __webpack_require__(11);
	
	module.exports = function template(locals) {
	var jade_debug = [ new jade.DebugItem( 1, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/menu_item.jade" ) ];
	try {
	var buf = [];
	var jade_mixins = {};
	var jade_interp;
	;var locals_for_with = (locals || {});(function (lastImport, model, t) {
	jade_debug.unshift(new jade.DebugItem( 0, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/menu_item.jade" ));
	jade_debug.unshift(new jade.DebugItem( 1, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/menu_item.jade" ));
	buf.push("<a" + (jade.attr("href", "#konnector/" + (model.slug) + "", true, true)) + ">");
	jade_debug.unshift(new jade.DebugItem( undefined, jade_debug[0].filename ));
	jade_debug.unshift(new jade.DebugItem( 2, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/menu_item.jade" ));
	buf.push("<span class=\"service-icon\">");
	jade_debug.unshift(new jade.DebugItem( undefined, jade_debug[0].filename ));
	jade_debug.shift();
	buf.push("</span>");
	jade_debug.shift();
	jade_debug.unshift(new jade.DebugItem( 3, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/menu_item.jade" ));
	buf.push("<div>");
	jade_debug.unshift(new jade.DebugItem( undefined, jade_debug[0].filename ));
	jade_debug.unshift(new jade.DebugItem( 4, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/menu_item.jade" ));
	buf.push("<span class=\"name\">" + (jade.escape(null == (jade_interp = model.name) ? "" : jade_interp)));
	jade_debug.unshift(new jade.DebugItem( undefined, jade_debug[0].filename ));
	jade_debug.shift();
	buf.push("</span>");
	jade_debug.shift();
	jade_debug.unshift(new jade.DebugItem( 5, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/menu_item.jade" ));
	if(lastImport != null && lastImport.length > 0)
	{
	jade_debug.unshift(new jade.DebugItem( 6, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/menu_item.jade" ));
	jade_debug.unshift(new jade.DebugItem( 6, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/menu_item.jade" ));
	buf.push("<span class=\"last-import\">" + (jade.escape(null == (jade_interp = lastImport) ? "" : jade_interp)));
	jade_debug.unshift(new jade.DebugItem( undefined, jade_debug[0].filename ));
	jade_debug.shift();
	buf.push("</span>");
	jade_debug.shift();
	jade_debug.shift();
	}
	jade_debug.shift();
	jade_debug.unshift(new jade.DebugItem( 8, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/menu_item.jade" ));
	if (model.isImporting === true)
	{
	jade_debug.unshift(new jade.DebugItem( 9, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/menu_item.jade" ));
	jade_debug.unshift(new jade.DebugItem( 9, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/menu_item.jade" ));
	buf.push("<div class=\"spinholder\">");
	jade_debug.unshift(new jade.DebugItem( undefined, jade_debug[0].filename ));
	jade_debug.unshift(new jade.DebugItem( 10, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/menu_item.jade" ));
	buf.push("<img src=\"images/spinner.svg\">");
	jade_debug.shift();
	jade_debug.shift();
	buf.push("</div>");
	jade_debug.shift();
	jade_debug.shift();
	}
	else if (model.errorMessage != null)
	{
	jade_debug.unshift(new jade.DebugItem( 12, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/menu_item.jade" ));
	jade_debug.unshift(new jade.DebugItem( 12, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/menu_item.jade" ));
	buf.push("<i" + (jade.attr("title", t('error occurred during import.'), true, true)) + " class=\"fa fa-warning\">");
	jade_debug.unshift(new jade.DebugItem( undefined, jade_debug[0].filename ));
	jade_debug.shift();
	buf.push("</i>");
	jade_debug.shift();
	jade_debug.shift();
	}
	jade_debug.shift();
	jade_debug.shift();
	buf.push("</div>");
	jade_debug.shift();
	jade_debug.shift();
	buf.push("</a>");
	jade_debug.shift();
	jade_debug.shift();}.call(this,"lastImport" in locals_for_with?locals_for_with.lastImport:typeof lastImport!=="undefined"?lastImport:undefined,"model" in locals_for_with?locals_for_with.model:typeof model!=="undefined"?model:undefined,"t" in locals_for_with?locals_for_with.t:typeof t!=="undefined"?t:undefined));;return buf.join("");
	} catch (err) {
	  jade.rethrow(err, jade_debug[0].filename, jade_debug[0].lineno, "a(href=\"#konnector/#{model.slug}\")\n    span.service-icon\n    div\n        span.name= model.name\n        - if(lastImport != null && lastImport.length > 0)\n            span.last-import= lastImport\n\n        - if (model.isImporting === true)\n            div.spinholder\n                img(src=\"images/spinner.svg\")\n        - else if (model.errorMessage != null)\n            i.fa.fa-warning(title=t('error occurred during import.'))\n\n");
	}
	}

/***/ },
/* 17 */
/***/ function(module, exports, __webpack_require__) {

	var jade = __webpack_require__(11);
	
	module.exports = function template(locals) {
	var jade_debug = [ new jade.DebugItem( 1, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/home.jade" ) ];
	try {
	var buf = [];
	var jade_mixins = {};
	var jade_interp;
	
	jade_debug.unshift(new jade.DebugItem( 0, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/home.jade" ));
	jade_debug.unshift(new jade.DebugItem( 1, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/home.jade" ));
	buf.push("<div id=\"menu\" class=\"menu\">");
	jade_debug.unshift(new jade.DebugItem( undefined, jade_debug[0].filename ));
	jade_debug.unshift(new jade.DebugItem( 2, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/home.jade" ));
	buf.push("<ul id=\"konnectors\">");
	jade_debug.unshift(new jade.DebugItem( undefined, jade_debug[0].filename ));
	jade_debug.shift();
	buf.push("</ul>");
	jade_debug.shift();
	jade_debug.shift();
	buf.push("</div>");
	jade_debug.shift();
	jade_debug.unshift(new jade.DebugItem( 3, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/home.jade" ));
	buf.push("<div class=\"container\">");
	jade_debug.unshift(new jade.DebugItem( undefined, jade_debug[0].filename ));
	jade_debug.shift();
	buf.push("</div>");
	jade_debug.shift();
	jade_debug.shift();;return buf.join("");
	} catch (err) {
	  jade.rethrow(err, jade_debug[0].filename, jade_debug[0].lineno, "#menu.menu\n    ul#konnectors\n.container\n");
	}
	}

/***/ },
/* 18 */
/***/ function(module, exports, __webpack_require__) {

	var jade = __webpack_require__(11);
	
	module.exports = function template(locals) {
	var jade_debug = [ new jade.DebugItem( 1, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/default.jade" ) ];
	try {
	var buf = [];
	var jade_mixins = {};
	var jade_interp;
	;var locals_for_with = (locals || {});(function (t) {
	jade_debug.unshift(new jade.DebugItem( 0, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/default.jade" ));
	jade_debug.unshift(new jade.DebugItem( 1, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/default.jade" ));
	buf.push("<div id=\"menu-toggler\">");
	jade_debug.unshift(new jade.DebugItem( undefined, jade_debug[0].filename ));
	jade_debug.unshift(new jade.DebugItem( 2, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/default.jade" ));
	buf.push("<div class=\"fa fa-bars\">");
	jade_debug.unshift(new jade.DebugItem( undefined, jade_debug[0].filename ));
	jade_debug.shift();
	buf.push("</div>");
	jade_debug.shift();
	jade_debug.shift();
	buf.push("</div>");
	jade_debug.shift();
	jade_debug.unshift(new jade.DebugItem( 4, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/default.jade" ));
	buf.push("<div id=\"default\" class=\"default\">");
	jade_debug.unshift(new jade.DebugItem( undefined, jade_debug[0].filename ));
	jade_debug.unshift(new jade.DebugItem( 5, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/default.jade" ));
	buf.push("<header>");
	jade_debug.unshift(new jade.DebugItem( undefined, jade_debug[0].filename ));
	jade_debug.shift();
	buf.push("</header>");
	jade_debug.shift();
	jade_debug.unshift(new jade.DebugItem( 6, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/default.jade" ));
	buf.push("<p>" + (jade.escape(null == (jade_interp = t('home headline')) ? "" : jade_interp)));
	jade_debug.unshift(new jade.DebugItem( undefined, jade_debug[0].filename ));
	jade_debug.shift();
	buf.push("</p>");
	jade_debug.shift();
	jade_debug.unshift(new jade.DebugItem( 7, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/default.jade" ));
	buf.push("<ul>");
	jade_debug.unshift(new jade.DebugItem( undefined, jade_debug[0].filename ));
	jade_debug.unshift(new jade.DebugItem( 8, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/default.jade" ));
	buf.push("<li>" + (jade.escape(null == (jade_interp = t('home config step 1')) ? "" : jade_interp)));
	jade_debug.unshift(new jade.DebugItem( undefined, jade_debug[0].filename ));
	jade_debug.shift();
	buf.push("</li>");
	jade_debug.shift();
	jade_debug.unshift(new jade.DebugItem( 9, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/default.jade" ));
	buf.push("<li>" + (jade.escape(null == (jade_interp = t('home config step 2')) ? "" : jade_interp)));
	jade_debug.unshift(new jade.DebugItem( undefined, jade_debug[0].filename ));
	jade_debug.shift();
	buf.push("</li>");
	jade_debug.shift();
	jade_debug.unshift(new jade.DebugItem( 10, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/default.jade" ));
	buf.push("<li>" + (jade.escape(null == (jade_interp = t('home config step 3')) ? "" : jade_interp)));
	jade_debug.unshift(new jade.DebugItem( undefined, jade_debug[0].filename ));
	jade_debug.shift();
	buf.push("</li>");
	jade_debug.shift();
	jade_debug.shift();
	buf.push("</ul>");
	jade_debug.shift();
	jade_debug.unshift(new jade.DebugItem( 11, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/default.jade" ));
	buf.push("" + (jade.escape((jade_interp = t('home more info')) == null ? '' : jade_interp)) + "");
	jade_debug.shift();
	jade_debug.unshift(new jade.DebugItem( 12, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/default.jade" ));
	buf.push("<ul>");
	jade_debug.unshift(new jade.DebugItem( undefined, jade_debug[0].filename ));
	jade_debug.unshift(new jade.DebugItem( 13, "/home/frankrousseau/projets/apps/konnectors/client/app/views/templates/default.jade" ));
	buf.push("<li>" + (jade.escape(null == (jade_interp = t('home help step 1')) ? "" : jade_interp)));
	jade_debug.unshift(new jade.DebugItem( undefined, jade_debug[0].filename ));
	jade_debug.shift();
	buf.push("</li>");
	jade_debug.shift();
	jade_debug.shift();
	buf.push("</ul>");
	jade_debug.shift();
	jade_debug.shift();
	buf.push("</div>");
	jade_debug.shift();
	jade_debug.shift();}.call(this,"t" in locals_for_with?locals_for_with.t:typeof t!=="undefined"?t:undefined));;return buf.join("");
	} catch (err) {
	  jade.rethrow(err, jade_debug[0].filename, jade_debug[0].lineno, "#menu-toggler\n    .fa.fa-bars\n\ndiv#default.default\n    header\n    p=t('home headline')\n    ul\n        li=t('home config step 1')\n        li=t('home config step 2')\n        li=t('home config step 3')\n    | #{t('home more info')}\n    ul\n        li=t('home help step 1')\n");
	}
	}

/***/ },
/* 19 */
/***/ function(module, exports) {

	var Router,
	  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
	  hasProp = {}.hasOwnProperty;
	
	module.exports = Router = (function(superClass) {
	  extend(Router, superClass);
	
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


/***/ },
/* 20 */
/***/ function(module, exports, __webpack_require__) {

	var map = {
		"./en": 21,
		"./en.coffee": 21,
		"./fr": 22,
		"./fr.coffee": 22
	};
	function webpackContext(req) {
		return __webpack_require__(webpackContextResolve(req));
	};
	function webpackContextResolve(req) {
		return map[req] || (function() { throw new Error("Cannot find module '" + req + "'.") }());
	};
	webpackContext.keys = function webpackContextKeys() {
		return Object.keys(map);
	};
	webpackContext.resolve = webpackContextResolve;
	module.exports = webpackContext;
	webpackContext.id = 20;


/***/ },
/* 21 */
/***/ function(module, exports) {

	module.exports = {
	  'bad credentials': 'Bad Credentials',
	  'no bills retrieved': 'No bills retrieved',
	  'key not found': 'Key not found',
	  'last import:': 'Last import:',
	  'save and import': 'Import and save',
	  'auto import': 'Automatic import',
	  'imported data:': 'Imported data:',
	  'importing...': 'importing...',
	  'no import performed': 'No import performed',
	  'import already running': 'Import is already running.',
	  'firstname': 'Firstname',
	  'lastname': 'Lastname',
	  'login': 'Login',
	  'password': 'Password',
	  'email': 'Email',
	  'bank_identifier': 'Bank identifier (optional)',
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
	  'select starting date': "Select a starting date",
	  'start import from': "From",
	  'authCode': "Auth code",
	  'accountName': "Account name",
	  'date format': 'LLL',
	  'add an account': "Add an account",
	  'remove last account': "Remove last account",
	  'home headline': "With Konnectors you can retrieve many data and save them into your Cozy.\nFrom your phone bills to your connected scale, or your tweets. Configure the connectors you are interested in:",
	  'home config step 1': "Select a connector in the menu on the left",
	  'home config step 2': "Follow the instructions to configure it",
	  'home config step 3': "Your data are retrieved and saved into your Cozy",
	  'home more info': "More information:",
	  'home help step 1': "You must manually trigger the import, except if you enable the auto-import.",
	  'notification import error': 'an error occurred during import of data',
	  'error occurred during import.': 'An error occurred during the last import.',
	  'error occurred during import:': 'An error occurred during the last import:',
	  "import server error": "Server error occured while importing.",
	  'open selected folder': 'Open selected folder',
	  'konnector description free': "Download all your internet bills from Free. This konnector requires the Files application to store the bill PDF files.",
	  'konnector description free mobile': "Download all your phone bills from Free Mobile. This konnector requires the Files application to store the bill PDF files.",
	  'konnector description bouygues': "Download all your phone bills from Bouygues Telecom. This konnector requires the Files application to store the bill PDF files.",
	  'konnector description bouygues box': "Download all your internet bills from Bouygues Telecom. This konnector requires the Files application to store the bill PDF files.",
	  'konnector description sfr_box': "Download all your internet bills from SFR or Red. This konnector requires the Files application to store the bill PDF files.",
	  'konnector description sfr_mobile': "Download all your mobile bills from SFR or Red. This konnector requires the Files application to store the bill PDF files.",
	  'konnector description github': "Download all your Github Bills. This konnector requires the Files application to store the bill PDF files.",
	  'konnector description github commits': "Save infos from all your Github Commits.",
	  'konnector description jawbone': "Download Move and Sleep Data from Jawbone CSV file.",
	  'konnector description rescuetime': "Download all your activities from Rescue Time",
	  'konnector description withings': "Download all your measures from your Withings account.",
	  'konnector description twitter': "Download all your tweets published on Twitter. This konnector requires two\nidentifiers and two secret keys. They can be generated on the <a\nhref=\"https://apps.twitter.com/ target=\"_blank\">Twitter app dashboard</a>. There you will\nbe able to create an app. They will give you credentials for this app. The\ncurrent konnector will use them to connect to Twitter and fetch your data.",
	  'konnector description digital ocean': "Download all your Digital Ocean Bills. This konnector requires the Files application to store the bill PDF files.",
	  'konnector description sosh': "Download all your Sosh Bills. This konnector requires the Files application to store the bill PDF files.",
	  'konnector description electrabel': "Download all you Electrabel Bills. This konnector requires the Files application to store the bill PDF files.",
	  'konnector description orange': "Download all your Orange Bills. This konnector requires the Files application to store the bill PDF files.",
	  'konnector description nest': "Save current temperature measured by your Nest thermostat.",
	  'konnector description numericable': "Download all your Numéricable Bills. This konnector requires the Files application to store the bill PDF files.",
	  'konnector description virginmobile': "Download all your Virgin Mobile  bills. This konnector requires the Files application to store the bill PDF files.",
	  'konnector description online_net': "Download all your Online.net bills. This konnector requires the Files application to store the bill PDF files.",
	  'konnector description ovh_eu': "Download all your OVH Europe bills. This konnector requires the Files application to store the bill PDF files.<br/>\nAt your first import, we will generate a link from which you will be able to enter your OVH Europe credentials.",
	  'konnector description ovh_ca': "Download all your OVH North-America bills. This konnector requires the Files application to store the bill PDF files.<br/>\nAt your first import, we will generate a link from which you will be able to enter your OVH North-America credentials.",
	  'konnector description runabove': "Download all your RunAbove bills. This konnector requires the Files application to store the bill PDF files.<br/>\nAt your first import, we will generate a link from which you will be able to enter your RunAbove credentials.",
	  'konnector description kimsufi_eu': "Download all your Kimsufi Europe bills. This konnector requires the Files application to store the bill PDF files.<br/>\nAt your first import, we will generate a link from which you will be able to enter your Kimsufi Europe credentials.",
	  'konnector description kimsufi_ca': "Download all your Kimsufi North-America bills. This konnector requires the Files application to store the bill PDF files.<br/>\nAt your first import, we will generate a link from which you will be able to enter your Kimsufi North-America credentials.",
	  'konnector description soyoustart_eu': "Download all your SoYouStart Europe bills. This konnector requires the Files application to store the bill PDF files.<br/>\nAt your first import, we will generate a link from which you will be able to enter your SoYouStart Europe credentials.",
	  'konnector description soyoustart_ca': "Download all your SoYouStart North-America bills. This konnector requires the Files application to store the bill PDF files.<br/>\nAt your first import, we will generate a link from which you will be able to enter your SoYouStart North-America credentials.",
	  'konnector description isen': "Students from ISEN engineer school can import their course materials and calendar.",
	  'konnector description ical_feed': "Download and import a remote Ical file (.ics).",
	  'konnector description birthdays': "Create events in your calendar for each birhday of your contacts (only contacts that match given tag will be selected).",
	  'konnector description googlecontacts': "Import your google contacts into your Cozy through google's API.",
	  'konnector description linkedin': "Import your Linkedin contacts in your Cozy.",
	  'konnector description ameli': "Import your Ameli reimbursements in your Cozy.",
	  'konnector description sncf': "Import your SNCF bills and events in your Cozy.",
	  'konnector description doctolib': "Import you Doctolib appointments in you Cozy.",
	  'konnector customview googlecontacts 4': "Initialize or reset this konnector",
	  'konnector customview googlecontacts 1': "1. Press \"connect your google account\" button to connect to your Google account and authorize your Cozy to access to it. Google will provide you with a complex string. Once you get it copy it in your clipboard, we will use it in second step.",
	  'konnector customview googlecontacts 2': "Connect your Google account",
	  'konnector customview googlecontacts 3': "2. Paste this string in the Auth code field. Then press 'Import and save' button to start the sync. Account name will be automatically updated.",
	  'notification prefix': "Konnector %{name}:",
	  'notification github commits': "%{smart_count} new commit imported |||| %{smart_count} new commits imported",
	  'notification linkedin created': "%{smart_count} new contact created |||| %{smart_count} new contacts created",
	  'notification linkedin updated': "%{smart_count} contact updated|||| %{smart_count} contacts updated",
	  'notification twitter': "%{smart_count} new tweet imported |||| %{smart_count} new tweets imported",
	  'notification free': "%{smart_count} new invoice imported |||| %{smart_count} new invoices imported",
	  'notification github': "%{smart_count} new invoice imported |||| %{smart_count} new invoices imported",
	  'notification jawbone': "%{smart_count} new measure imported |||| %{smart_count} new measures imported",
	  'notification rescuetime': "%{smart_count} new activity imported |||| %{smart_count} new activites imported",
	  'notification withings': "%{smart_count} new measure imported |||| %{smart_count} new measures imported",
	  'notification free mobile': "%{smart_count} new invoice imported |||| %{smart_count} new invoices imported",
	  'notification digital ocean': "%{smart_count} new invoice imported |||| %{smart_count} new invoices imported",
	  'notification sosh': "%{smart_count} new invoice imported |||| %{smart_count} new invoices imported",
	  'notification electrabel': "%{smart_count} new invoice imported |||| %{smart_count} new invoices imported",
	  'notification numericable': "%{smart_count} new invoice imported |||| %{smart_count} new invoices imported",
	  'notification virginmobile': "%{smart_count} new invoice imported |||| %{smart_count} new invoices imported",
	  'notification online_net': "%{smart_count} new invoice imported |||| %{smart_count} new invoices imported",
	  'notification ical_feed creation': "%{smart_count} new event imported |||| %{smart_count} new events imported",
	  'notification ical_feed update': "%{smart_count} new event updated |||| %{smart_count} new events updated",
	  'notification birthdays creation': "%{smart_count} new birthday created |||| %{smart_count} new birthdays created",
	  'notification ovh_eu': "%{smart_count} new invoice imported |||| %{smart_count} new invoices imported",
	  'notification ovh_ca': "%{smart_count} new invoice imported |||| %{smart_count} new invoices imported",
	  'notification runabove': "%{smart_count} new invoice imported |||| %{smart_count} new invoices imported",
	  'notification kimsufi_eu': "%{smart_count} new invoice imported |||| %{smart_count} new invoices imported",
	  'notification kimsufi_ca': "%{smart_count} new invoice imported |||| %{smart_count} new invoices imported",
	  'notification soyoustart_eu': "%{smart_count} new invoice imported |||| %{smart_count} new invoices imported",
	  'notification soyoustart_ca': "%{smart_count} new invoice imported |||| %{smart_count} new invoices imported",
	  'notification ameli': "%{smart_count} new reimbursement imported |||| %{smart_count} new reimbursements imported",
	  'notification sncf bills': "%{smart_count} new invoice imported |||| %{smart_count} new invoices imported",
	  'notification sncf events creation': "%{smart_count} new event imported |||| %{smart_count} new events imported",
	  'notification sncf events update': "%{smart_count} new event updated |||| %{smart_count} new events updated",
	  'notification sfr_box': "%{smart_count} new invoice imported |||| %{smart_count} new invoices imported",
	  'notification sfr_mobile': "%{smart_count} new invoice imported |||| %{smart_count} new invoices imported",
	  'notification doctolib creation': "%{smart_count} new event imported |||| %{smart_count} new events imported",
	  'notification doctolib update': "%{smart_count} event updated |||| %{smart_count} events updated",
	  "konnector birthdays birthday": "Birthday of",
	  "konnector sncf reference": "Reference",
	  "konnector sncf ticket choice": "Ticket choice",
	  "konnector danger zone": "Danger zone",
	  "konnector delete credentials": "Delete this configuration.",
	  "konnector deleted": "The konnector configuration was successfully deleted.",
	  "konnector deletion error": "An error occured while deleting this konnector configuration.",
	  'notification isen': "%{smart_count} new course material imported |||| %{smart_count} new course materials imported",
	  'notification isen event changed': "Careful, the intervention %{description} will take place on %{newDate} instead of %{oldDate}",
	  'notification isen date format': "MM/DD [at] HH:mm a",
	  'notification isen event deleted': "Careful, the intervention %{description} that should have taken place on %{date} has been canceled",
	  "calendar": "Calendar in which events will be imported",
	  "url": "Target URL",
	  "tag": "Tag"
	};


/***/ },
/* 22 */
/***/ function(module, exports) {

	module.exports = {
	  'bad credentials': 'Mauvais identifiants',
	  'no bills retrieved': 'Pas de factures trouvées',
	  'key not found': 'Clé non trouvée',
	  'last import:': 'Dernière importation :',
	  'save and import': 'Importer et sauvegarder',
	  'auto import': 'Importation automatique',
	  'imported data:': 'Données importées :',
	  'importing...': 'importation en cours...',
	  'no import performed': "Pas d'importation effectuée",
	  'import already running': "L'import est déjà en cours.",
	  'firstname': 'Prénom',
	  'lastname': 'Nom',
	  'login': 'Identifiant',
	  'password': 'Mot de passe',
	  'email': 'Mail',
	  'bank_identifier': 'Identifiant bancaire (optionnel)',
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
	  'select starting date': 'Sélectionnez une date de départ',
	  'start import from': 'À partir du',
	  'authCode': "Auth code",
	  'accountName': "Nom du compte",
	  'date format': 'DD/MM/YYYY [à] HH[h]mm',
	  'add an account': "Ajouter un compte",
	  'remove last account': "Supprimer le dernier compte",
	  'home headline': "Konnectors vous permet de récupérer de nombreuses données et de les intégrer à votre Cozy.\nDe vos factures de téléphone aux données de votre balance connectée en passant par vos tweets. Configurez les connecteurs qui vous intéressent :",
	  'home config step 1': "Sélectionnez un connecteur dans le menu à gauche",
	  'home config step 2': "Suivez les instructions pour le configurer",
	  'home config step 3': "Vos données sont récupérées et intégrées à votre Cozy",
	  'home more info': "Quelques informations supplémentaires :",
	  'home help step 1': "Vous devez manuellement déclencher l'importation sauf si vous avez activé l'importation automatique",
	  'notification import error': "une erreur est survenue pendant l'importation des données",
	  'notification linkedin created': "%{smart_count} nouveau contact créé|||| %{smart_count} nouveaux contacts créés",
	  'notification linkedin updated': "%{smart_count} contact mis a jour|||| %{smart_count} contacts mis a jour",
	  'error occurred during import.': 'Une erreur est survenue lors de la dernière importation.',
	  'error occurred during import:': 'Une erreur est survenue lors de la dernière importation :',
	  "import server error": "L'import a rencontré une erreur serveur.",
	  'open selected folder': 'Ouvrir le dossier sélectionné',
	  'konnector description free': "Téléchargez toutes vos factures internet de Free. Pour pouvoir stocker les factures au format PDF, ce connecteur requiert que l'application Files soit installée sur votre Cozy.",
	  'konnector description free mobile': "Téléchargez toutes vos factures Free Mobile. Pour pouvoir stocker les factures au format PDF, ce connecteur requiert que l'application Files soit installée sur votre Cozy.",
	  'konnector description bouygues': "Téléchargez toutes vos factures téléphones de Bouygues Telecom. Pour pouvoir stocker les factures au format PDF, ce connecteur requiert que l'application Files soit installée sur votre Cozy.",
	  'konnector description bouygues box': "Téléchargez toutes vos factures internet de Bouygues Telecom. Pour pouvoir stocker les factures au format PDF, ce connecteur requiert que l'application Files soit installée sur votre Cozy.",
	  'konnector description sfr_box': "Téléchargez toutes vos factures internet de SFR. Pour pouvoir stocker les factures au format PDF, ce connecteur requiert que l'application Files soit installée sur votre Cozy.",
	  'konnector description sfr_mobile': "Téléchargez toutes vos factures internet de SFR. Pour pouvoir stocker les factures au format PDF, ce connecteur requiert que l'application Files soit installée sur votre Cozy.",
	  'konnector description github': "Téléchargez toutes vos factures Github. Pour pouvoir stocker les factures au format PDF, ce connecteur requiert que l'application Files soit installée sur votre Cozy.",
	  'konnector description github commits': "Sauvegardez les informations de tous vos commits Github.",
	  'konnector description jawbone': "Téléchargez les données de déplacement et de sommeil depuis un fichier CSV Jawbone.",
	  'konnector description rescuetime': "Téléchargez toutes vos activités RescueTime.",
	  'konnector description withings': "Téléchargez toutes les mesures de vos appareils Withings.",
	  'konnector description twitter': "Téléchargez tous vos tweets publiés sur Twitter. Ce connecteur requiert\ndeux identifiants et deux clés secrètes. Vous pouvez les générer via le\n<a href=\"https://apps.twitter.com/\" target=\"_blank\">tableau Twitter de gestion\nd'applications</a>. Vous pourrez y créer une application. Twitter vous\nfournira des identifiants pour cette application. Avec ces identifiants\nce connecteur pourra récupérer vos données.",
	  'konnector description digital ocean': "Téléchargez toutes vos factures Digital Ocean. Pour pouvoir stocker les factures au format PDF, ce connecteur requiert que l'application Files soit installée sur votre Cozy.",
	  'konnector description sosh': "Téléchargez toutes vos factures Sosh. Pour pouvoir stocker les factures au format PDF, ce connecteur requiert que l'application Files soit installée sur votre Cozy.",
	  'konnector description electrabel': "Téléchargez toutes vos factures Electrabel. Pour pouvoir stocker les factures au format PDF, ce connecteur requiert que l'application Files soit installée sur votre Cozy.",
	  'konnector description orange': "Téléchargez toutes vos factures Orange. Pour pouvoir stocker les factures au format PDF, ce connecteur requiert que l'application Files soit installée sur votre Cozy.",
	  'konnector description numericable': "Téléchargez toutes vos factures Numéricable. Pour pouvoir stocker les factures au format PDF, ce connecteur requiert que l'application Files soit installée sur votre Cozy.",
	  'konnector description virginmobile': "Téléchargez toutes vos factures Virgin Mobile. Pour pouvoir stocker les factures au format PDF, ce connecteur requiert que l'application Files soit installée sur votre Cozy.",
	  'konnector description online_net': "Téléchargez toutes vos factures Online.net. Pour pouvoir stocker les factures au format PDF, ce connecteur requiert que l'application Files soit installée sur votre Cozy.",
	  'konnector description ovh_eu': "Téléchargez toutes vos factures OVH Europe. Pour pouvoir stocker les factures au format PDF, ce connecteur requiert que l'application Files soit installée sur votre Cozy.<br/>\nLors de votre premier import, nous générerons un lien à partir duquel vous pourrez rentrer vos identifiants OVH Europe.",
	  'konnector description ovh_ca': "Téléchargez toutes vos factures OVH North-America. Pour pouvoir stocker les factures au format PDF, ce connecteur requiert que l'application Files soit installée sur votre Cozy.<br/>\nLors de votre premier import, nous générerons un lien à partir duquel vous pourrez rentrer vos identifiants OVH Europe.",
	  'konnector description runabove': "Téléchargez toutes vos factures RunAbove. Pour pouvoir stocker les factures au format PDF, ce connecteur requiert que l'application Files soit installée sur votre Cozy.<br/>\nLors de votre premier import, nous générerons un lien à partir duquel vous pourrez rentrer vos identifiants OVH Europe.",
	  'konnector description kimsufi_eu': "Téléchargez toutes vos factures Kimsufi Europe. Pour pouvoir stocker les factures au format PDF, ce connecteur requiert que l'application Files soit installée sur votre Cozy.<br/>\nLors de votre premier import, nous générerons un lien à partir duquel vous pourrez rentrer vos identifiants OVH Europe.",
	  'konnector description kimsufi_ca': "Téléchargez toutes vos factures Kimsufi North-America. Pour pouvoir stocker les factures au format PDF, ce connecteur requiert que l'application Files soit installée sur votre Cozy.<br/>\nLors de votre premier import, nous générerons un lien à partir duquel vous pourrez rentrer vos identifiants OVH Europe.",
	  'konnector description soyoustart_eu': "Téléchargez toutes vos factures SoYouStart Europe. Pour pouvoir stocker les factures au format PDF, ce connecteur requiert que l'application Files soit installée sur votre Cozy.<br/>\nLors de votre premier import, nous générerons un lien à partir duquel vous pourrez rentrer vos identifiants OVH Europe.",
	  'konnector description soyoustart_ca': "Téléchargez toutes vos factures SoYouStart North-America. Pour pouvoir stocker les factures au format PDF, ce connecteur requiert que l'application Files soit installée sur votre Cozy.<br/>\nLors de votre premier import, nous générerons un lien à partir duquel vous pourrez rentrer vos identifiants OVH Europe.",
	  'konnector description nest': "Enregistrez la température actuelle mesurée par votre Nest.",
	  'konnector description isen': "Les étudiants de l'école d'ingénieur ISEN peuvent importer leurs supports de cours et leur agenda.",
	  'konnector description googlecontacts': "Importez vos contacts Google dans votre Cozy via l'API de Google.",
	  'konnector description linkedin': "Importez vos contacts LinkedIn dans votre Cozy.",
	  'konnector description ical_feed': "Téléchargez et importez un fichier iCal disponible en ligne (.ics).",
	  'konnector description birthdays': "Créez un événement dans votre calendrier pour chaque anniversaire de vos contacts (seulement les contacts taggés avec le tag donné seront pris en compte.",
	  'konnector description ameli': "Importez vos remboursements Ameli dans votre Cozy.",
	  'konnector description sncf': "Importez vos factures et événements SNCF dans votre Cozy.",
	  'konnector description doctolib': "Importez vos rendez-vous Doctolib dans votre Cozy.",
	  'konnector customview googlecontacts 4': "Initialiser ou réinitialiser ce konnector",
	  'konnector customview googlecontacts 1': "1. Cliquez sur le bouton \"Connecter votre compte google\" afin de connecter votre compte google et autoriser Cozy à y accéder. La fenêtre de Google va présenter une chaîne de caractère comlexe pour cela. Copiez la, elle sera utile à l'étape 2.",
	  'konnector customview googlecontacts 2': "Connecter votre compte Google",
	  'konnector customview googlecontacts 3': "2. Copiez cette chaîne de caractères dans le champs Auth code. Puis cliquez sur le bouton \"Importer et sauvegarder \" pour lancer l'importation.  Le nom du compte sera mis à jour automatiquement.",
	  'notification prefix': "Konnector %{name} :",
	  'notification github commits': "%{smart_count} nouveau commit importé |||| %{smart_count} nouveaux commits importés",
	  'notification twitter': "%{smart_count} nouveau tweet importé |||| %{smart_count} nouveaux tweets importés",
	  'notification free': "%{smart_count} nouvelle facture importée |||| %{smart_count} nouvelles factures importées",
	  'notification github': "%{smart_count} nouvelle facture importée |||| %{smart_count} nouvelles factures importées",
	  'notification jawbone': "%{smart_count} nouvelle mesure importée |||| %{smart_count} nouvelles mesures importées",
	  'notification rescuetime': "%{smart_count} nouvelle activité importée |||| %{smart_count} nouvelles activités importées",
	  'notification withings': "%{smart_count} nouvelle mesure importée |||| %{smart_count} nouvelles mesures importées",
	  'notification free mobile': "%{smart_count} nouvelle facture importée |||| %{smart_count} nouvelles factures importées",
	  'notification digital ocean': "%{smart_count} nouvelle facture importée |||| %{smart_count} nouvelles factures importées",
	  'notification sosh': "%{smart_count} nouvelle facture importée |||| %{smart_count} nouvelles factures importées",
	  'notification electrabel': "%{smart_count} nouvelle facture importée |||| %{smart_count} nouvelles factures importées",
	  'notification numericable': "%{smart_count} nouvelle facture importée |||| %{smart_count} nouvelles factures importées",
	  'notification virginmobile': "%{smart_count} nouvelle facture importée |||| %{smart_count} nouvelles factures importées",
	  'notification online_net': "%{smart_count} nouvelle facture importée |||| %{smart_count} nouvelles factures importées",
	  'notification ical_feed creation': "%{smart_count} nouvel événement importé. |||| %{smart_count} nouveaux événements importés.",
	  'notification ical_feed update': "%{smart_count} événement mis à jour. |||| %{smart_count} événements mis à jour.",
	  'notification birthdays creation': "%{smart_count} nouvel anniversaire créé. |||| %{smart_count} nouveaux anniversaires créés.",
	  'notification ovh_eu': "%{smart_count} nouvelle facture importée |||| %{smart_count} nouvelles factures importées",
	  'notification ovh_ca': "%{smart_count} nouvelle facture importée |||| %{smart_count} nouvelles factures importées",
	  'notification runabove': "%{smart_count} nouvelle facture importée |||| %{smart_count} nouvelles factures importées",
	  'notification kimsufi_eu': "%{smart_count} nouvelle facture importée |||| %{smart_count} nouvelles factures importées",
	  'notification kimsufi_ca': "%{smart_count} nouvelle facture importée |||| %{smart_count} nouvelles factures importées",
	  'notification soyoustart_eu': "%{smart_count} nouvelle facture importée |||| %{smart_count} nouvelles factures importées",
	  'notification soyoustart_ca': "%{smart_count} nouvelle facture importée |||| %{smart_count} nouvelles factures importées",
	  'notification ameli': "%{smart_count} nouveau remboursement importé |||| %{smart_count} nouveaux remboursement importés",
	  'notification sncf bills': "%{smart_count} nouvelle facture importée |||| %{smart_count} nouvelles factures importées",
	  'notification sncf events creation': "%{smart_count} nouvel événement importé. |||| %{smart_count} nouveaux événements importés.",
	  'notification sncf events update': "%{smart_count} événement mis à jour. |||| %{smart_count} événements mis à jour.",
	  'notification sfr_box': "%{smart_count} nouvelle facture importée |||| %{smart_count} nouvelles factures importées",
	  'notification sfr_mobile': "%{smart_count} nouvelle facture importée |||| %{smart_count} nouvelles factures importées",
	  'notification doctolib creation': "%{smart_count} nouveau rendez-vous importé |||| %{smart_count} nouveaux rendez-vous importés",
	  'notification doctolib update': "%{smart_count} rendez-vous mis à jour |||| %{smart_count} rendez-vous mis à jour",
	  "konnector birthdays birthday": "Anniversaire de",
	  "konnector sncf reference": "Référence",
	  "konnector sncf ticket choice": "Choix du billet",
	  "konnector danger zone": "Zone dangereuse",
	  "konnector delete credentials": "Supprimer cette configuration.",
	  "konnector deleted": "La configuration de ce connecteur a bien été supprimée.",
	  "konnector deletion error": "Une erreur est survenue lors de la suppression de la configuration de ce connecteur.",
	  'notification isen': "%{smart_count} nouveau support de cours importé |||| %{smart_count} nouveaux supports de cours importés",
	  'notification isen event changed': "Attention, l'intervention %{description} se déroulera le %{newDate} au lieu du %{oldDate}",
	  'notification isen date format': "DD/MM [à] HH:mm",
	  'notification isen event deleted': "Attention, l'intervention %{description} devant se dérouler le %{date} a été annulée",
	  "calendar": "Le calendrier dans lequel les événements seront importés",
	  "url": "URL cible",
	  "tag": "Tag"
	};


/***/ }
/******/ ]);
//# sourceMappingURL=app.js.map