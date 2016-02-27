(function(){ "use strict";

	var nivo = (function(){

		/*
		 * Commons
		 */
		var nivo = {};

		/**
		 * Retreive a deep node in an object by using the dot-syntax
		 * @param  {object} obj     The Object being traversed
		 * @param  {string} dotKeys The dotseparated keys
		 * @return {mixed}          The value found at the given keys
		 */
		nivo.objRetreive = function(obj, dotKeys) {
				var keys = dotKeys.split('.');
				keys.forEach(function(key) {
						if (typeof obj[key] === 'undefined') return '';
						obj = obj[key];
				});
				return obj;
		};

		/**
		 * Check whether or not a passed selector matches a given element
		 * @param  {domNode} element  The element that will be checked against the selector
		 * @param  {string} selector    The selector that needs to be checked
		 * @return {Bool}               Indicates whether or not the selector was valid
		 */
		nivo.elementMatches = function(element, selector) {
				var matches = false;
				if (element instanceof HTMLElement) {
						if (element.matches) {
								matches = element.matches(selector);
						} else if (element.msMatchesSelector) {
								matches = element.msMatchesSelector(selector);
						} else if (element.webkitMatchesSelector) {
								matches = element.webkitMatchesSelector(selector);
						}
				}
				return matches;
		};

		/**
		 * Event Delegation
		 * @param  {domNode}   node      The root node that will added an eventlistener on
		 * @param  {string}    evtName   The event name we will listen for
		 * @param  {string}    selector  The selector for the target element
		 * @param  {callable}  callback  The event callback
		 * @return {void}
		 */
		nivo.on = function(node, evtName, selector, callback) {
				var args = [].slice.call(arguments);
				callback = args.length == 3 ? args[2] : callback;
				selector = args.length == 3 ? null : selector;

				node.addEventListener(evtName, function(e) {
						var target = e.target;

						if (selector === null) {
								callback.call(target, e);
								return;
						}

						while (target !== null) {
								if (nivo.elementMatches(target, selector)) {
										callback.call(target, e);
										break;
								}
								target = target.parentNode;
						}
				});
		};

		/**
		 * Core initialization implicitly instantiated once by the Controller
		 */
		var App = function(){
			nivo.on(document, 'keyup', '[nv-model]', function() {
				var
					element = this,
					scope = null,
					model = element.getAttribute('nv-model'),
					value = element.value;

				// retreive the current scope by traversing up the dom
				while (element !== null && scope === null) {
					if (element.$scope)
						scope = element.$scope;
					else
						element = element.parentNode;
				}

				// sometimes a model was not set before
				if(scope[model] !== value){
					scope.set(model, value);
				}
			});
		};

		/**
		 * Controller
		 * @param {string} name  The Controllers Name
		 * @param {[type]} init  The Controllers Main Function
		 */
		var Controller = function(name, init) {
			var
				element = document.querySelector('[nv-controller="' + name + '"]'),
				$scope =  new Scope();

			// init the app the first time
			if(window.nv_app === undefined){
				window.nv_app = new App();
			}

			element.$scope = $scope;
			init.call(this, $scope);
			$scope.bindView(element);
		};

		/**
		 * The Scope That will be instantiated by the controller
		 * managing the actual modelView binding
		 */
		var Scope = function(){
			this.htmlNodes = {};
		};

		/**
		 * Set a model to the scope and update the view
		 * @param {string} key
		 * @param {mixed}  val
		 */
		Scope.prototype.set = function(key, val) {
			// set the model
			var _this = this;
			val = val !== undefined ? val : this[key]; // since val is optional..
			this[key] = val;

			// update the view
			this.htmlNodes[key].forEach(function(element){
				if(element.type === 'textNode'){
					// a textnode can host multiple bindings so we need to replace all of them
					var content = element.node.nv_tmpl;
					[].forEach.call(element.node.nv_bindings, function(binding){
						var value = _this[binding];
						content = content.replace(new RegExp('\{\{\s*'+binding+'\s*\}\}', 'g'), value);
					});
					element.node.nodeValue = content;
				}else{
					if(element.node.value !== val)
					element.node.value = val;
				}
			});
		};

		/**
		 * Add a node found in the view to the model
		 * @param {string}  key
		 * @param {domNode} node  The node that will be updated in the event of a changing model
		 */
		Scope.prototype._addNode = function(key, node) {
			if(typeof this.htmlNodes[key] === 'object'){
				this.htmlNodes[key].push(node);
			}else{
				this.htmlNodes[key] = [node];
			}
		};

		/**
		 * Find all textnodes with a valid placeholder in their contents
		 * @param  {domNode} el  The element we are looking for the nodes
		 * @return {array}       All found textelements
		 */
		Scope.prototype.textNodes = function(el){
			var
				node,
				textNodes = [],
				walk = document.createTreeWalker(el,NodeFilter.SHOW_TEXT,function(node){
					if (node.nodeValue.match(/\{\{[^\}]+\}\}/)) // we are only interested in nodes containing a model reference
						return NodeFilter.FILTER_ACCEPT;
					else
						return NodeFilter.FILTER_SKIP;
				},false);

			while(node=walk.nextNode()){
				node.nv_tmpl = node.nodeValue;
				textNodes.push(node);
			}

			return textNodes;
		};

		/**
		 * Called once by the controller after initialization. Find all bindings in the view and assignes accorging models to the scope
		 * @param  {domNode} element  The actual view
		 * @return void
		 */
		Scope.prototype.bindView = function(element){
			var _this = this;

			// add all textnodes to the htmlNodesasdf
			[].forEach.call(this.textNodes(element), function(textNode){
				var keys = {};
				[].forEach.call(textNode.nodeValue.match(/\{\{\s*([^\{\s]+)\s*\}\}/g), function(match){
					// match: {{modelA}} lorem {{modelB}}
					var model = match.replace(/[\{\}]/g, '');
					keys[model] = null; // assign only the key to end up with unique keys assigned to this node

					if(typeof textNode.nv_bindings === 'object'){
						textNode.nv_bindings.push(model);
					}else{
						textNode.nv_bindings = [model];
					}
				});

				for(var key in keys){
					_this._addNode(key, {node: textNode, type: 'textNode'});
					_this.set(key, nivo.objRetreive(_this, key));
				}
			});
			// add all inputs to the htmlNodes
			[].forEach.call(element.querySelectorAll('[nv-model]'), function(element) {
				var model = element.getAttribute('nv-model');
				element.value = nivo.objRetreive(_this, model);
				var node = {node: element, type: 'domNode'};
				_this._addNode(model, node);
			});
		};

		/**
		 * Add a bound node to the nodeslist
		 * @param {strig} model
		 * @param {domNode} node
		 */
		Scope.prototype._addNode = function(model, node) {
			if(typeof this.htmlNodes[model] === 'object'){
				this.htmlNodes[model].push(node);
			}else{
				this.htmlNodes[model] = [node];
			}
		};

		return {
			Controller: Controller
		};
	}());

	window.nivo = nivo;
}());