var IOWorker;

if (typeof self !== 'undefined' && self.importScripts) {
	
	IOWorker = {};
	
	
	IOWorker.on = (function () {
		var funcs = {};
		addEventListener('message', function (event) {
			var res, type, data, i, li;
			
			try { res = JSON.parse(event.data); }
			catch (e) { return; }
			
			if (typeof res.data === 'undefined') {
				res.data = undefined;
			}
			
			type = res.type;
			data = res.data;
			
			if (!funcs.hasOwnProperty(type)) {
				funcs[type] = [];
			}
			
			for (i = 0, li = funcs[type].length; i < li; i++) {
				if (typeof funcs[type][i] === 'function') {
					funcs[type][i].apply(null, [data]);
				}
			}
		}, false);
		
		return function (type, func) {
			if (typeof func !== 'function') { return false; }
			
			if (!funcs.hasOwnProperty(type)) {
				funcs[type] = [];
			}
			
			funcs[type].push(func);
			
			return this;
		};
	})();
	
	
	
	IOWorker.send = function (type, data) {
		if (typeof data === 'undefined') {
			data = null;
		}
		
		type += '';
		var res = JSON.stringify({
			type: type,
			data: data
		});
		
		postMessage(res);
		
		return this;
	};
	
}



else {
		
	IOWorker = function (src) {
		if (typeof src !== 'string' || typeof Worker === 'undefined') {
		    return false;
		}
		
		var myWorker = new Worker(src);
		var funcs = {};
		
		return {
			send: function (type, data) {
				if (typeof data === 'undefined') {
					data = null;
				}
				
				type += '';
				var res = JSON.stringify({
					type: type,
					data: data
				});
				
				myWorker.postMessage(res);
				return this;
			},
			
			on: (function () {
				myWorker.addEventListener('message', function (event) {
					var res, type, data, i, li;
					
					try { res = JSON.parse(event.data); }
					catch (e) { return; }
					
					if (typeof res.data === 'undefined') {
						res.data = undefined;
					}
					
					type = res.type;
					data = res.data;
					
					if (!funcs.hasOwnProperty(type)) {
						funcs[type] = [];
					}
					
					for (i = 0, li = funcs[type].length; i < li; i++) {
						if (typeof funcs[type][i] === 'function') {
							funcs[type][i].apply(null, [data]);
						}
					}
				}, false);
				
				return function (type, func) {
					if (typeof func !== 'function') { return false; }
					
					if (!funcs.hasOwnProperty(type)) {
						funcs[type] = [];
					}
					
					funcs[type].push(func);
					return this;
				};
			})(),
			
			addEventListener: function () {
				myWorker.addEventListener.apply(myWorker, arguments);
				return this;
			},
			
			destroy: function () {
				myWorker.terminate();
				return this;
			},
			
			reset: function () {
				myWorker.terminate();
				myWorker = new Worker(src);
				return this;
			}
		};
	};	
}