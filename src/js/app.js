$.extend(true, {

	app: {

		options: {},

		prototypes: {
			Model: {
				requests: []
			},

			View: {
				domId: "#app",
				loadingId: "#loading",
				formInput: [
					{
						"column": "Name",
						"label": "Name",
						"name": "name",
						"type": "text",
						"title": "Try proper value",
						"validator": "[A-Z][a-z]+"
					},
					{
						"column": "Tel",
						"label": "1234567890",
						"name": "phone",
						"type": "text",
						"title": "Try proper value",
						"validator": "[0-9]+"
					},
					{
						"column": "Email",
						"label": "email@server.com",
						"name": "email",
						"type": "text",
						"title": "Try proper value",
						"validator": "[a-z0-9_\-]+@[a-z0-9\-]+.[a-z]+"
					},
					{
						"column": "Site",
						"label": "http://www.home-site.com",
						"name": "url",
						"type": "text",
						"title": "Try proper value",
						"validator": "https?:\/\/(www.)?[a-z0-9\-]+.[a-z]+"
					},
					{
						"label": "Submit",
						"name": "submit",
						"type": "submit",
					}
				]
			},

			Controller: {}
		},

		pubsub: function(o){
			var pub = {
				subs: {
					any: []
				},

				on: function(type, fn){
					type = type || "any";

					if (typeof this.subs[type] === "undefined") {
						this.subs[type] = [];
					};

					this.subs[type].push(fn);
				},

				off: function(type, fn){
					this.invoke('unsub', type, fn);
				},

				pub: function(type, data){
					this.invoke('pub', type, data);
				},

				invoke: function(action, type, arg){
					var type = type || "any",
						subs = this.subs[type];

					$.each(subs, function(k, v){
						if (action = "pub") {
							v(arg);
						} else {
							if (v === arg) {
								subs.splice(k, 1);
							};
						};
					});
				}
			};

			$.each(pub, function(k, v){
				if (pub.hasOwnProperty(k) && typeof pub[k] === "function") {
					o[k] = pub[k];
				};
			})

			o.subs = {
				any: []
			}
		},

		comp: function(name, fn, prototype, deps){
			$.app[name] = $.app[name] || function(){
				var depComps = [];

				$.each(deps, function(k, v){
					if ($.app[v]) {
						depComps.push($.app[v]);
					};
				});

				$.extend(true, $.app[name].prototype, prototype || {}, $.app.options);

				depComps = depComps.concat($.app.utils.args(arguments));

				$.app.pubsub(this);

				fn.apply(this, depComps);
			};

			return $.app[name];
		},

		utils: {
			args: function(args){
				return Array.prototype.slice.call(args);
			}
		}

	}

});

/* ===== MODELS ===== */
/* DataModel */
$.app.comp("DataModel", function(){
	var view = $.app.utils.args(arguments)[0],
		self = this;

	this.dataHandler = function(data){
		var request;

		request = $.Deferred();
		/*request = $.ajax({
			method: "POST",
			url: "",
			data: data
		});*/

		request.done(function(data){
			self.pub("dataLoaded", data);
		});

		this.requests.push(request);

		request.resolve({
			"uid": (new Date()).getTime(),
			"data": data,
			"status": "OK"
		});
	};
}, $.app.prototypes.Model, []);
/* ===== /MODELS ===== */

/* ===== VIEWS ===== */
/* App */
$.app.comp("App", function(AppView, FormController, DataModel){
	var self = this;
		view = new AppView(),
		model = new DataModel(this),
		controller = new FormController(model);

	this.view = view;
	this.view.app.resolve({
		app: this
	});

	this.dom = $(this.domId);
	this.dom.append(view.dom);
	$(this.loadingId).hide();
	this.dom.fadeIn(1000);

	model.on("dataLoaded", function(data){
		self.dataHandler.call(self, data)
	});

	this.dataHandler = function(data){
		this.pub("newRow", data);
	};

	view.form.on("dataSubmited", function(data){
		controller.dataHandler.call(controller, data);
	});
}, $.app.prototypes.View, ["AppView", "FormController", "DataModel"]);

/* AppView */
$.app.comp("AppView", function(FormView, TableView){
	var form = new FormView(),
		table = new TableView();

	this.form = form;
	this.table = table;

	this.dom = $("<div class=\"app\">");
	this.dom.append(form.dom);
	this.dom.append(table.dom);

	this.app = $.Deferred();
	this.app.done(function(data){
		data.app.on("newRow", function(data){
			table.dataHandler.call(table, data);
		});
	});
}, $.app.prototypes.View, ["FormView", "TableView"]);

/* FormView */
$.app.comp("FormView", function(FormItemView, FormController){
	var self = this,
		form = $("<form>");

	self.inputs = [];

	$.each(self.formInput, function(k, v){
		var item = new FormItemView(v);

		if (v.type === "submit") {
			self.submit = item;
		} else {
			self.inputs.push(item);
		};

		form.append(item.dom);
	});

	this.dom = $("<div class=\"form\">").append(form);

	this.watcher = form.submit(function(){
		return self.submitWatcher.apply(self);
	});
}, $.extend({
	submitWatcher: function(){
		var json = {};

		if (this.validate()) {
			$.each(this.inputs, function(k, v){
				var item = v.dom.find('input');

				json[item.attr("name")] = item.val();
			});

			json = JSON.stringify(json);

			this.pub("dataSubmited", json);
		};

		return false;
	},
	validate: function(){
		var empty = 0;

		$.each(this.inputs, function(k, v){
			if (v.dom.find('input').val() === "") {
				empty++;

				v.dom.find('input').addClass("error");
			} else {
				v.dom.find('input').removeClass("error");
			};
		});

		return empty === 0;
	}
}, $.app.prototypes.View), ["FormItemView"]);

/* FormItemView */
$.app.comp("FormItemView", function(FormView){
	var item = $("<input>"),
		arg = $.app.utils.args(arguments)[0];

	item.attr("name", arg.name);

	if (arg.type === "submit") {
		item.attr("type", "submit");
		item.attr("value", arg.label);
		item.addClass("submit");
	} else {
		item.attr("type", arg.type);
		item.attr("placeholder", arg.label);
		item.attr("pattern", arg.validator);
		item.attr("title", arg.title);
		item.addClass("text");
	};

	this.dom = $("<div class=\"row\">").append(item);
}, $.app.prototypes.View, []);

/* TableView */
$.app.comp("TableView", function(TableRowView){
	var table = $("<table>"),
		th = $("<tr>");

	$.each(this.formInput, function(k, v){
		var cell;

		if (v.type === "text") {
			cell = $("<th>");

			cell.text(v.column);

			th.append(cell);
		};
	});

	table.append(th);

	this.dom = $("<div class=\"table\">").append(table);

	this.stack = [];

	this.dataHandler = function(data){
		this.addRow(data);
	};
	this.addRow = function(data){
		var row = new TableRowView(data);

		table.append(row.dom);

		this.stack.push(row);
	};
}, $.app.prototypes.View, ["TableRowView"]);

/* TableRowView */
$.app.comp("TableRowView", function(){
	var data = JSON.parse($.app.utils.args(arguments)[0].data),
		row;

	row = $("<tr>");

	$.each(data, function(k, v){
		var cell = $("<td>");

		cell.text(v);

		row.append(cell);
	});

	this.dom = row;
}, $.app.prototypes.View, []);
/* ===== /VIEWS ===== */

/* ===== CONTROLLERS ===== */
/* FormController */
$.app.comp("FormController", function(){
	var model = $.app.utils.args(arguments)[0];

	this.dataHandler = function(data){
		this.pub("dataPosted", data);
	};

	this.on("dataPosted", function(data){
		model.dataHandler.call(model, data);
	})
}, $.app.prototypes.Controller, []);
/* ===== /CONTROLLERS ===== */