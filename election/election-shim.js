// Stands in for Claude's artifact runtime (claude.use("db" | "user" | "room"))
// on bs.xitter.space: documents live in Xitter's database (src/election.ts),
// anyone can read them, and only Xitter admins can write. The room is a
// server-sent event stream for the instant sync, presenter pointer and viewer
// count, and it says when a document changed so readers fetch it at once.
(function () {
	var API = "/i/electionnov22/api";
	function rid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
	var tab = rid(), me;
	try { me = localStorage.getItem("emap-me") || rid(); localStorage.setItem("emap-me", me); } catch (e) { me = tab; }
	function fail(code) { var e = new Error(code); e.code = code; return e; }
	async function call(method, path, body) {
		var r = await fetch(API + path, { method: method, credentials: "same-origin", headers: body ? { "content-type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined, cache: "no-store" });
		if (r.status === 401 || r.status === 403) throw fail("invalid_argument");
		if (r.status === 413) throw fail("quota_exceeded");
		if (r.status === 429) throw fail("resource_exhausted");
		if (!r.ok) throw fail("unavailable");
		return r.json();
	}
	var docListeners = []; // { prefix, fn }
	function changed(path) { docListeners.forEach(function (l) { if (path === l.path || path.indexOf(l.prefix) === 0) l.fn(); }); }

	function snapOf(path, r, pending) {
		var data = r.exists ? r.data : undefined;
		return { id: path.split("/").pop(), exists: !!r.exists, data: function () { return data === undefined ? undefined : JSON.parse(JSON.stringify(data)); }, metadata: { fromCache: false, hasPendingWrites: !!pending } };
	}
	function docRef(path) {
		var seen = -1, subs = [];
		function deliver(r, pending) { seen = r.v; var s = snapOf(path, r, pending); subs.forEach(function (f) { try { f(s); } catch (e) { console.error(e); } }); }
		var ref = {
			id: path.split("/").pop(),
			get: async function () { return snapOf(path, await call("GET", "/doc?path=" + encodeURIComponent(path))); },
			set: async function (data) {
				deliver({ exists: true, data: data, v: seen }, true);
				var r = await call("POST", "/doc?path=" + encodeURIComponent(path), { data: data });
				seen = r.v;
			},
			delete: async function () { await call("POST", "/doc?path=" + encodeURIComponent(path), { delete: true }); },
			onSnapshot: function (fn, err) {
				subs.push(fn);
				var tries = 0, first = true, busy = false;
				async function load() {
					if (busy) return; busy = true;
					try {
						var r = await call("GET", "/doc?path=" + encodeURIComponent(path) + (first ? "" : "&v=" + seen));
						if (first || !r.same) { first = false; seen = r.v; fn(snapOf(path, r, false)); }
						tries = 0;
					} catch (e) { if (first && ++tries >= 3 && err) { first = false; err(e); } }
					finally { busy = false; }
				}
				load();
				docListeners.push({ path: path, prefix: "\u0000", fn: load });
				setInterval(function () { if (!document.hidden) load(); }, 15000);
				return function () {};
			},
		};
		return ref;
	}
	function colRef(name) {
		async function get() {
			var r = await call("GET", "/col?name=" + encodeURIComponent(name));
			var docs = r.docs.map(function (d) { return snapOf(name + "/" + d.id, { exists: true, data: d.data }); });
			return { docs: docs, size: docs.length, empty: !docs.length, forEach: function (f) { docs.forEach(f); } };
		}
		return {
			get: get,
			doc: function (id) { return docRef(name + "/" + id); },
			onSnapshot: function (fn, err) {
				var load = function () { get().then(fn, function (e) { if (err) err(e); }); };
				load();
				docListeners.push({ path: "\u0000", prefix: name + "/", fn: load });
				return function () {};
			},
		};
	}
	var db = { doc: docRef, collection: colRef };

	var canWrite = null;
	async function can() { if (canWrite === null) { try { canWrite = !!(await call("GET", "/me")).canWrite; } catch (e) { canWrite = false; } } return canWrite; }
	var user = { can: async function (what) { return what === "data.write" ? can() : false; } };

	// the room
	var handlers = {}, connSubs = [], peerSubs = [], open = false, es = null;
	function setOpen(v) { open = v; connSubs.forEach(function (c) { try { c[0](v); } catch (e) {} }); }
	function connect() {
		if (!window.EventSource) return;
		es = new EventSource(API + "/room?tab=" + tab + "&me=" + me);
		es.onopen = function () { setOpen(true); };
		es.onerror = function () { setOpen(false); };
		es.onmessage = function (e) {
			var m; try { m = JSON.parse(e.data); } catch (x) { return; }
			if (m.ev === "$doc") return changed(m.path);
			if (m.ev === "$peers") return peerSubs.forEach(function (p) { try { p[0]({ peers: m.peers }); } catch (x) {} });
			(handlers[m.ev] || []).forEach(function (h) { try { h({ data: m.data, isMe: m.me === me, sameTab: m.tab === tab }); } catch (x) { console.error(x); } });
		};
	}
	var room = {
		on: function (ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); return function () {}; },
		emit: function (ev, data) { return call("POST", "/room", { ev: ev, data: data, tab: tab, me: me }); },
		onConnection: function (fn, err) { connSubs.push([fn, err]); fn(open); return function () {}; },
		onPeers: function (fn, err) { peerSubs.push([fn, err]); return function () {}; },
		connected: function () { return open; },
	};
	connect();

	window.claude = { use: async function (name) { return name === "db" ? db : name === "user" ? user : name === "room" ? room : null; } };
})();
