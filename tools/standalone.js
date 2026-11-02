/* AC Cam List outside Claude: the same small surface the app asks Claude for (db, user, downloads),
   answered by Firebase (Firestore + sign-in) when config.js has a project, and by nothing otherwise,
   so the app keeps everything in this browser on its own. */
(function () {
  var SDK = 'https://www.gstatic.com/firebasejs/10.14.1/';
  var cfg = window.AC_CONFIG && window.AC_CONFIG.firebase;
  var standalone = false; try { standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch (e) {}
  var CODES = {'permission-denied': 'not_granted', 'unauthenticated': 'not_granted', 'invalid-argument': 'invalid_argument', 'not-found': 'invalid_argument', 'unavailable': 'unavailable', 'resource-exhausted': 'resource_exhausted', 'deadline-exceeded': 'unavailable'};
  var wrapErr = function (e) { console.warn(e); return {code: CODES[e && e.code] || (e && e.code) || 'unknown'}; };
  // Firestore keeps no arrays directly inside arrays: carry inner ones as {_a: [...]}
  var enc = function (v) { return Array.isArray(v) ? v.map(function (x) { return Array.isArray(x) ? {_a: enc(x)} : enc(x); }) : (v && typeof v === 'object') ? Object.fromEntries(Object.entries(v).filter(function (kv) { return kv[0] !== ''; }).map(function (kv) { return [kv[0], enc(kv[1])]; })) : v; };
  var dec = function (v) { return Array.isArray(v) ? v.map(dec) : (v && typeof v === 'object') ? (Object.keys(v).length === 1 && Array.isArray(v._a) ? dec(v._a) : Object.fromEntries(Object.entries(v).map(function (kv) { return [kv[0], dec(kv[1])]; }))) : v; };

  var conn = null;
  function connect() {
    if (conn) return conn;
    conn = (async function () {
      if (!cfg || !cfg.apiKey) return null;
      var mods = await Promise.all([import(SDK + 'firebase-app.js'), import(SDK + 'firebase-auth.js'), import(SDK + 'firebase-firestore.js')]);
      var A = mods[0], AU = mods[1], F = mods[2];
      // on Firebase's own address, sign-in runs on the same address (needed inside an iPhone home-screen app)
      var onFbHost = /\.(firebaseapp\.com|web\.app)$/.test(location.hostname);
      var c = onFbHost ? Object.assign({}, cfg, {authDomain: location.hostname}) : cfg;
      var app = A.initializeApp(c), auth = AU.getAuth(app), fs;
      try { fs = F.initializeFirestore(app, {ignoreUndefinedProperties: true, localCache: F.persistentLocalCache({tabManager: F.persistentMultipleTabManager()})}); }
      catch (e) { fs = F.initializeFirestore(app, {ignoreUndefinedProperties: true}); }
      var redirectErr = null;
      try { await AU.getRedirectResult(auth); } catch (e) { redirectErr = e; }
      try { await auth.authStateReady(); } catch (e) {}
      if (!auth.currentUser) await AU.signInAnonymously(auth);
      var docsOf = function (uid) { return F.collection(fs, 'users/' + uid + '/docs'); };
      // a Google account that already has lists elsewhere: bring this device's productions into it (its own settings stay)
      async function adopt(cred) {
        var anon = auth.currentUser, carry = [];
        if (anon && anon.isAnonymous) { var s = await F.getDocs(docsOf(anon.uid)).catch(function () { return null; }); if (s) s.docs.forEach(function (d) { if (d.id !== 'settings') carry.push([d.id, d.data()]); }); }
        var r = await AU.signInWithCredential(auth, cred);
        await Promise.all(carry.map(function (x) { return F.setDoc(F.doc(docsOf(r.user.uid), x[0]), x[1], {merge: true}).catch(function () {}); }));
      }
      if (redirectErr && redirectErr.code === 'auth/credential-already-in-use') {
        var rc = AU.GoogleAuthProvider.credentialFromError(redirectErr);
        if (rc) { await adopt(rc); location.reload(); await new Promise(function () {}); }
      }
      var provider = new AU.GoogleAuthProvider();
      try { provider.setCustomParameters({prompt: 'select_account'}); } catch (e) {}
      window.AC_AUTH = {
        user: function () { var u = auth.currentUser; return u && !u.isAnonymous ? {name: u.displayName || '', email: u.email || ''} : null; },
        signIn: async function () {
          var u = auth.currentUser;
          try {
            if (standalone && onFbHost) { if (u && u.isAnonymous) await AU.linkWithRedirect(u, provider); else await AU.signInWithRedirect(auth, provider); return; }
            if (u && u.isAnonymous) await AU.linkWithPopup(u, provider); else await AU.signInWithPopup(auth, provider);
          } catch (e) {
            if (e && e.code === 'auth/credential-already-in-use') { var cred = AU.GoogleAuthProvider.credentialFromError(e); if (!cred) throw e; await adopt(cred); }
            else if (e && /popup-closed-by-user|cancelled-popup-request/.test(e.code || '')) return;
            else throw e;
          }
          location.reload();
        },
        signOut: async function () {
          await AU.signOut(auth);
          try { ['accam-productions-v1', 'accam-settings-v1'].forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
          location.reload();
        }
      };
      var me = auth.currentUser.uid;
      var mapCol = function (path) {
        var m = /^data\/users\/([^/]+)$/.exec(path);
        if (!m || m[1] !== me) throw {code: 'invalid_argument'};
        return docsOf(me);
      };
      var db = {
        collection: function (path) {
          var col = mapCol(path);
          return {
            doc: function (id) {
              var ref = F.doc(col, id);
              return {
                set: function (d) { return F.setDoc(ref, enc(d)).catch(function (e) { throw wrapErr(e); }); },
                delete: function () { return F.deleteDoc(ref).catch(function (e) { throw wrapErr(e); }); }
              };
            },
            onSnapshot: function (cb, err) {
              return F.onSnapshot(col, {includeMetadataChanges: true}, function (s) {
                cb({docs: s.docs.map(function (d) { return {id: d.id, exists: true, data: function () { return dec(d.data()); }}; }), metadata: {fromCache: s.metadata.fromCache}});
              }, function (e) { var w = wrapErr(e); if (err) err(w); });
            }
          };
        }
      };
      return {db: db, user: {id: async function () { return me; }}};
    })().catch(function (e) { console.warn('cloud', e); return null; });
    return conn;
  }

  // files: the share sheet on phones (save to Files, send on WhatsApp), a plain download elsewhere
  var downloads = {
    save: async function (o) {
      var blob = o.data instanceof Blob ? o.data : new Blob([o.data], {type: /\.csv$/i.test(o.filename) ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8'});
      var touch = false; try { touch = matchMedia('(pointer: coarse)').matches; } catch (e) {}
      if (touch && navigator.canShare && typeof File === 'function') {
        var file = new File([blob], o.filename, {type: blob.type || 'application/octet-stream'});
        if (navigator.canShare({files: [file]})) {
          try { await navigator.share({files: [file], title: o.filename}); return; }
          catch (e) { if (e && e.name === 'AbortError') throw {code: 'declined'}; }
        }
      }
      var url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = o.filename; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
    }
  };

  window.claude = {
    use: async function (name) {
      if (name === 'downloads') return downloads;
      if (name === 'db') { var c = await connect(); return c && c.db; }
      if (name === 'user') { var c2 = await connect(); return c2 && c2.user; }
      return null;
    }
  };
})();
